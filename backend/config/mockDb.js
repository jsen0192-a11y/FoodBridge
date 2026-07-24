const fs = require('fs');
const path = require('path');

const MOCK_DB_PATH = path.join(__dirname, '../mock_db.json');

// Initialize empty collections if file doesn't exist
if (!fs.existsSync(MOCK_DB_PATH)) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify({
    users: [],
    ngos: [],
    donations: [],
    volunteers: [],
    deliveries: [],
    notifications: []
  }, null, 2));
}

function readData() {
  try {
    const raw = fs.readFileSync(MOCK_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading mock DB file:", error);
    return {
      users: [],
      ngos: [],
      donations: [],
      volunteers: [],
      deliveries: [],
      notifications: []
    };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing mock DB file:", error);
  }
}

let isMockEnabled = false;

module.exports = {
  enableMockDb() {
    isMockEnabled = true;
    console.log("⚠️ MOCK DATABASE FALLBACK ENABLED (Active File: mock_db.json)");
  },
  
  isMockActive() {
    return isMockEnabled;
  },

  async find(collection, query = {}) {
    const data = readData();
    let list = data[collection] || [];
    
    // Simple filter
    return list.filter(item => {
      for (let key in query) {
        // Handle nested or simple comparison
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  },

  async findOne(collection, query = {}) {
    const list = await this.find(collection, query);
    return list[0] || null;
  },

  async findById(collection, id) {
    const data = readData();
    const list = data[collection] || [];
    return list.find(item => item.id === id || item._id === id) || null;
  },

  async create(collection, doc) {
    const data = readData();
    if (!data[collection]) data[collection] = [];
    
    const newDoc = {
      _id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    
    // Add compatibility with Mongoose's .id
    newDoc.id = newDoc._id;
    
    data[collection].push(newDoc);
    writeData(data);
    return newDoc;
  },

  async findByIdAndUpdate(collection, id, update) {
    const data = readData();
    const list = data[collection] || [];
    const index = list.findIndex(item => item._id === id || item.id === id);
    
    if (index === -1) return null;
    
    const updatedDoc = {
      ...list[index],
      ...update,
      updatedAt: new Date().toISOString()
    };
    
    list[index] = updatedDoc;
    data[collection] = list;
    writeData(data);
    return updatedDoc;
  },

  async delete(collection, id) {
    const data = readData();
    const list = data[collection] || [];
    const index = list.findIndex(item => item._id === id || item.id === id);
    
    if (index === -1) return false;
    
    list.splice(index, 1);
    data[collection] = list;
    writeData(data);
    return true;
  }
};
