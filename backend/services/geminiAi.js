const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log("🤖 Gemini AI services active");
} else {
  console.log("⚠️ GEMINI_API_KEY not configured. Using rule-based mock AI classification.");
}

function fileToGenerativePart(base64Str) {
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      inlineData: {
        data: matches[2],
        mimeType: matches[1]
      }
    };
  }
  return {
    inlineData: {
      data: base64Str.replace(/^data:image\/\w+;base64,/, ""),
      mimeType: "image/jpeg"
    }
  };
}

module.exports = {
  isConfigured() {
    return !!genAI;
  },

  async analyzeDonationImage(imageBase64, foodName = '', quantity = '') {
    if (!genAI || !imageBase64) {
      console.log(`🤖 [Gemini AI Fallback] Analyzing mock data for: "${foodName}"`);
      const score = Math.floor(Math.random() * 20) + 75; 
      let category = "Cooked Meals";
      
      const lower = foodName.toLowerCase();
      if (lower.includes('vegetable') || lower.includes('fruit') || lower.includes('tomato')) {
        category = "Vegetables & Fruits";
      } else if (lower.includes('bread') || lower.includes('roti') || lower.includes('cake')) {
        category = "Bakery Items";
      } else if (lower.includes('can') || lower.includes('pack')) {
        category = "Canned Foods";
      } else if (lower.includes('rice') || lower.includes('grain')) {
        category = "Raw Groceries";
      }

      // Rule-based meal estimation
      const qtyNumberMatch = quantity.match(/(\d+)/);
      const extractedQty = qtyNumberMatch ? parseInt(qtyNumberMatch[1], 10) : 15;
      const estimatedMeals = quantity.toLowerCase().includes('kg') ? extractedQty * 4 : extractedQty;

      return {
        freshnessScore: score,
        category,
        predictedExpiryHours: category === "Vegetables & Fruits" ? 48 : category === "Cooked Meals" ? 6 : 72,
        mealEstimation: estimatedMeals,
        isSpam: false,
        spamReason: ""
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const imgPart = fileToGenerativePart(imageBase64);
      
      const prompt = `
        You are an expert food safety inspector AI for FoodBridge.
        Analyze this food image, the item name: "${foodName}", and quantity description: "${quantity}".
        Provide your analysis in JSON format ONLY with the following schema:
        {
          "freshnessScore": number (0 to 100),
          "category": string (one of "Cooked Meals", "Raw Groceries", "Vegetables & Fruits", "Canned Foods", "Bakery Items", "Other"),
          "predictedExpiryHours": number (estimate hours remaining before unsafe),
          "mealEstimation": number (estimated individual serving counts this listing represents, based on container size in image and description quantity),
          "isSpam": boolean (true if image is unrelated to food, spam, fake, inappropriate, dangerous, or blank/black),
          "spamReason": string (reason for spam if isSpam is true, otherwise empty)
        }
        Respond with ONLY the JSON object. Do not include markdown tags like \`\`\`json.
      `;

      const result = await model.generateContent([prompt, imgPart]);
      const response = await result.response;
      const text = response.text().trim();
      
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      return {
        freshnessScore: parsed.freshnessScore || 80,
        category: parsed.category || 'Cooked Meals',
        predictedExpiryHours: parsed.predictedExpiryHours || 12,
        mealEstimation: parsed.mealEstimation || 15,
        isSpam: !!parsed.isSpam,
        spamReason: parsed.spamReason || ''
      };
    } catch (error) {
      console.error("Gemini AI API call failed, falling back to mock:", error.message);
      return {
        freshnessScore: 85,
        category: "Cooked Meals",
        predictedExpiryHours: 8,
        mealEstimation: 20,
        isSpam: false,
        spamReason: ""
      };
    }
  }
};
