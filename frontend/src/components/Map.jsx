import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map({ 
  center = [12.9716, 77.5946], 
  zoom = 13, 
  markers = [], 
  onMapClick = null,
  routeCoordinates = null 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());
  const routeLayerRef = useRef(L.layerGroup());

  // Check if we want to use Google Maps (based on API Key environment config)
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const googleMapRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const googlePolylineRef = useRef(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey !== 'your_google_maps_key_here') {
      setUseGoogleMaps(true);
    }
  }, []);

  // 1. Leaflet Map setup
  useEffect(() => {
    if (useGoogleMaps || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      scrollWheelZoom: true,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      });
    }

    mapInstanceRef.current = map;
    markersLayerRef.current.addTo(map);
    routeLayerRef.current.addTo(map);

    return () => {
      map.remove();
    };
  }, [useGoogleMaps]);

  // Leaflet Center Update
  useEffect(() => {
    if (!useGoogleMaps && mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom, useGoogleMaps]);

  // Leaflet Markers Update
  useEffect(() => {
    if (useGoogleMaps || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach(m => {
      if (!m.lat || !m.lng) return;

      let colorClass = 'marker-donation';
      let iconHtml = '🍎';
      
      if (m.iconType === 'ngo') {
        colorClass = 'marker-ngo';
        iconHtml = '🏢';
      } else if (m.iconType === 'donor') {
        colorClass = 'marker-donor';
        iconHtml = '🍳';
      } else if (m.iconType === 'volunteer') {
        colorClass = 'marker-volunteer';
        iconHtml = '🛵';
      }

      const icon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="marker-pin-wrapper">
            <div class="marker-pulse ${colorClass}-pulse"></div>
            <div class="marker-pin ${colorClass}">
              <span>${iconHtml}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -35]
      });

      const marker = L.marker([m.lat, m.lng], { icon });

      if (m.popupText) {
        marker.bindPopup(`<div class="map-popup-card">${m.popupText}</div>`);
      }

      markersLayerRef.current.addLayer(marker);
    });
  }, [markers, useGoogleMaps]);

  // Leaflet Routing Polyline Update
  useEffect(() => {
    if (useGoogleMaps || !mapInstanceRef.current) return;

    routeLayerRef.current.clearLayers();

    if (routeCoordinates && routeCoordinates.length >= 2) {
      const polyline = L.polyline(routeCoordinates, {
        color: '#10B981',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
      });

      routeLayerRef.current.addLayer(polyline);

      const bounds = L.latLngBounds(routeCoordinates);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoordinates, useGoogleMaps]);


  // 2. Google Maps API setup
  useEffect(() => {
    if (!useGoogleMaps || !googleMapRef.current) return;

    // Load Google Maps SDK dynamically if it hasn't loaded yet
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;
      window.initGoogleMap = () => {
        initGoogleMapInstance();
      };
      document.head.appendChild(script);
    } else {
      initGoogleMapInstance();
    }

    function initGoogleMapInstance() {
      const mapOptions = {
        center: { lat: center[0], lng: center[1] },
        zoom: zoom,
        styles: [
          {
            "featureType": "poi",
            "elementType": "labels",
            "stylers": [{ "visibility": "off" }]
          }
        ]
      };
      
      const map = new window.google.maps.Map(googleMapRef.current, mapOptions);
      googleMapInstanceRef.current = map;

      if (onMapClick) {
        map.addListener('click', (e) => {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        });
      }
    }
  }, [useGoogleMaps]);

  // Google Maps Center Update
  useEffect(() => {
    if (useGoogleMaps && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setCenter({ lat: center[0], lng: center[1] });
      googleMapInstanceRef.current.setZoom(zoom);
    }
  }, [center[0], center[1], zoom, useGoogleMaps]);

  // Google Maps Markers & Polyline update
  useEffect(() => {
    if (!useGoogleMaps || !googleMapInstanceRef.current || !window.google) return;

    // Clear old markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // Add new markers
    markers.forEach(m => {
      if (!m.lat || !m.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: googleMapInstanceRef.current,
        title: m.popupText || 'Marker'
      });

      if (m.popupText) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div class="map-popup-card">${m.popupText}</div>`
        });
        marker.addListener('click', () => {
          infoWindow.open(googleMapInstanceRef.current, marker);
        });
      }

      googleMarkersRef.current.push(marker);
    });

    // Draw route polyline
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
    }

    if (routeCoordinates && routeCoordinates.length >= 2) {
      const path = routeCoordinates.map(coord => ({ lat: coord[0], lng: coord[1] }));
      
      const polyline = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#10B981',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: googleMapInstanceRef.current
      });

      googlePolylineRef.current = polyline;

      // Fit bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      googleMapInstanceRef.current.fitBounds(bounds);
    }
  }, [markers, routeCoordinates, useGoogleMaps]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {useGoogleMaps ? (
        <div ref={googleMapRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
      ) : (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
      )}
      
      <style>{`
        .custom-map-marker {
          background: transparent;
          border: none;
        }
        .marker-pin-wrapper {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .marker-pin {
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: #10B981;
          position: absolute;
          transform: rotate(-45deg);
          left: 4px;
          top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          border: 2px solid #ffffff;
        }
        .marker-pin span {
          transform: rotate(45deg);
          font-size: 16px;
        }
        .marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.4);
          animation: markerPulseAnim 1.8s infinite ease-out;
        }
        
        .marker-ngo { background: #3b82f6 !important; }
        .marker-ngo-pulse { background: rgba(59, 130, 246, 0.4) !important; }

        .marker-volunteer { background: #f97316 !important; }
        .marker-volunteer-pulse { background: rgba(249, 115, 22, 0.4) !important; }

        .marker-donation { background: #eab308 !important; }
        .marker-donation-pulse { background: rgba(234, 179, 8, 0.4) !important; }

        @keyframes markerPulseAnim {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .map-popup-card {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 4px;
          color: #1e293b;
        }
        .map-popup-card h4 {
          margin-bottom: 4px;
          font-family: 'Outfit', sans-serif;
          color: #10B981;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
