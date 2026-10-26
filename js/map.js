/**
 * RescueRoute — Leaflet & SVG Interactive Tactical Map Controller
 * Displays live incidents, active fleet responders, road network graph, shelters, danger zones,
 * and highlighted shortest-path routing corridors.
 * Includes graceful SVG vector fallback if external map tiles cannot load offline.
 */

class RescueMapController {
  constructor() {
    this.map = null;
    this.markersGroup = null;
    this.routesGroup = null;
    this.hazardsGroup = null;
    this.roadNetworkGroup = null;
    this.activeFilter = 'all';
    this.animatedMissionPolylines = [];
    this.useFallback = false;
  }

  initMap() {
    const mapElement = document.getElementById('rescueMap');
    if (!mapElement) return;

    // Check if Leaflet L is available
    if (typeof L !== 'undefined') {
      try {
        this.map = L.map('rescueMap', {
          center: [DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng],
          zoom: DEFAULT_COORDINATES.zoom,
          zoomControl: true,
          attributionControl: false
        });

        // Add sleek CartoDB style layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 18,
          subdomains: 'abcd',
          timeout: 4000
        }).addTo(this.map);

        this.roadNetworkGroup = L.layerGroup().addTo(this.map);
        this.hazardsGroup = L.layerGroup().addTo(this.map);
        this.routesGroup = L.layerGroup().addTo(this.map);
        this.markersGroup = L.layerGroup().addTo(this.map);

        this.map.on('click', (e) => {
          this.handleMapClick(e.latlng.lat, e.latlng.lng);
        });

        console.log("RescueRoute Map initialized with Leaflet engine.");
      } catch (err) {
        console.warn("Leaflet map initialization fallback required:", err);
        this.initSvgFallback(mapElement);
      }
    } else {
      this.initSvgFallback(mapElement);
    }

    this.renderAllMapLayers();
  }

  /**
   * Interactive Fallback Vector SVG Map when Leaflet CDN is unavailable
   */
  initSvgFallback(container) {
    this.useFallback = true;
    container.innerHTML = `
      <div class="svg-map-fallback" style="width:100%; height:100%; position:relative; background:#0f172a; overflow:hidden;">
        <svg id="fallbackSvg" width="100%" height="100%" viewBox="0 0 800 500" style="width:100%; height:100%;">
          <defs>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1"/>
            </pattern>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow"/>
              <feComposite in="SourceGraphic" in2="glow" operator="over"/>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="#0b1120"/>
          <rect width="100%" height="100%" fill="url(#gridPattern)"/>
          
          <!-- Stylized River Adyar & Coastal shoreline -->
          <path d="M 50 150 Q 250 180 400 240 T 750 380" fill="none" stroke="#1e3a5f" stroke-width="26" stroke-linecap="round"/>
          <path d="M 50 150 Q 250 180 400 240 T 750 380" fill="none" stroke="#0284c7" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
          
          <!-- Dynamic layers -->
          <g id="svgRoadNetworkLayer"></g>
          <g id="svgHazardsLayer"></g>
          <g id="svgRoutesLayer"></g>
          <g id="svgMarkersLayer"></g>
        </svg>
      </div>
    `;
  }

  // Convert GPS to SVG coordinates for fallback mode
  gpsToSvg(lat, lng) {
    const minLat = 12.9600;
    const maxLat = 13.1200;
    const minLng = 80.1800;
    const maxLng = 80.2900;

    const x = ((lng - minLng) / (maxLng - minLng)) * 720 + 40;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 420 + 40;
    return { x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(470, y)) };
  }

  renderAllMapLayers() {
    if (this.useFallback) {
      this.renderSvgFallbackLayers();
      return;
    }

    if (!this.map || !this.markersGroup) return;

    this.markersGroup.clearLayers();
    this.hazardsGroup.clearLayers();
    this.routesGroup.clearLayers();
    if (this.roadNetworkGroup) this.roadNetworkGroup.clearLayers();

    const incidents = window.rescueStore.getIncidents();
    const units = window.rescueStore.getUnits();
    const shelters = window.rescueStore.getShelters();
    const hazards = window.rescueStore.getHazards();

    // 0. Render Road Network Graph (Requirement 4)
    if (this.roadNetworkGroup && window.rescueRoadNetwork) {
      const edges = window.rescueRoadNetwork.getAllEdges();
      edges.forEach(e => {
        const nodeA = window.rescueRoadNetwork.getNode(e.from);
        const nodeB = window.rescueRoadNetwork.getNode(e.to);
        if (nodeA && nodeB) {
          const isBlocked = e.isBlocked;
          const roadLine = L.polyline([[nodeA.lat, nodeA.lng], [nodeB.lat, nodeB.lng]], {
            color: isBlocked ? '#ef4444' : '#94a3b8',
            weight: isBlocked ? 4 : 2,
            opacity: isBlocked ? 0.8 : 0.45,
            dashArray: isBlocked ? '6, 6' : undefined
          });

          roadLine.bindPopup(`
            <div style="font-family:sans-serif; font-size:11px;">
              <strong>Road:</strong> ${e.roadName}<br/>
              <strong>Distance:</strong> ${e.weight} km<br/>
              <strong>Status:</strong> ${isBlocked ? '⛔ Blocked (Hazard)' : '✓ Open'}
            </div>
          `);
          this.roadNetworkGroup.addLayer(roadLine);
        }
      });
    }

    // 1. Render Hazards
    if (this.activeFilter === 'all' || this.activeFilter === 'hazards') {
      hazards.forEach(hazard => {
        if (!hazard.active) return;
        const circle = L.circle([hazard.lat, hazard.lng], {
          radius: hazard.radiusMeters || 350,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.28,
          dashArray: '6, 6',
          weight: 2
        });

        circle.bindPopup(`
          <div style="font-family:sans-serif; min-width:200px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="background:#ef4444; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;">ROADBLOCK</span>
              <strong style="font-size:12px; color:#0f172a;">${hazard.title}</strong>
            </div>
            <p style="font-size:11px; color:#475569; margin:4px 0;">${hazard.warning}</p>
            <div style="font-size:11px; margin-top:6px; font-weight:600; color:#dc2626;">Water/Debris Level: ${hazard.waterDepthMeters}m</div>
          </div>
        `);
        this.hazardsGroup.addLayer(circle);
      });
    }

    // 2. Render Shelters
    if (this.activeFilter === 'all' || this.activeFilter === 'shelters') {
      shelters.forEach(shelter => {
        const iconHtml = `
          <div style="background:#7c3aed; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(124,58,237,0.5); border:2px solid #fff; font-size:16px;">
            🏕️
          </div>
        `;
        const customIcon = L.divIcon({ html: iconHtml, className: 'shelter-marker-icon', iconSize: [34, 34], iconAnchor: [17, 17] });
        const marker = L.marker([shelter.lat, shelter.lng], { icon: customIcon });

        const pct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:220px;">
            <div style="background:#f5f3ff; color:#7c3aed; font-weight:700; font-size:10px; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">SAFE EVACUATION SHELTER</div>
            <h4 style="font-size:13px; margin:0 0 4px; color:#0f172a;">${shelter.name}</h4>
            <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${shelter.locationName} (${shelter.nodeId || 'Node'})</div>
            <div style="background:#f1f5f9; padding:6px 8px; border-radius:4px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;">
                <span>Occupancy</span>
                <span>${shelter.currentOccupancy} / ${shelter.capacity} (${pct}%)</span>
              </div>
              <div style="height:6px; background:#cbd5e1; border-radius:3px; overflow:hidden; margin-top:4px;">
                <div style="width:${pct}%; height:100%; background:${pct > 85 ? '#ef4444' : '#10b981'};"></div>
              </div>
            </div>
            <button onclick="window.rescueApp.openEvacModalForShelter('${shelter.id}')" style="width:100%; background:#7c3aed; color:#fff; border:none; padding:6px; font-size:11px; font-weight:600; border-radius:4px; cursor:pointer;">
              Transfer Evacuees Here
            </button>
          </div>
        `);
        this.markersGroup.addLayer(marker);
      });
    }

    // 3. Render Incidents
    if (this.activeFilter === 'all' || this.activeFilter === 'incidents') {
      incidents.forEach(inc => {
        if (inc.status === 'RESOLVED') return;

        const isCritical = inc.severity === 'CRITICAL';
        const color = isCritical ? '#ef4444' : (inc.severity === 'HIGH' ? '#f97316' : '#eab308');
        const iconEmoji = inc.type === 'FLOOD' ? '🌊' : (inc.type === 'FIRE' ? '🔥' : (inc.type === 'COLLAPSE' ? '🏚️' : '🚨'));

        const markerHtml = `
          <div style="position:relative; width:38px; height:38px;">
            <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${color}; opacity:0.3; animation:pulse-ring 1.8s infinite;"></div>
            <div style="position:relative; width:34px; height:34px; margin:2px; border-radius:50%; background:${color}; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid #fff; font-size:16px;">
              ${iconEmoji}
            </div>
            <span style="position:absolute; top:-4px; right:-4px; background:#0f172a; color:#fff; font-size:9px; font-weight:800; padding:1px 5px; border-radius:10px; border:1px solid #fff;">
              ${inc.victims}
            </span>
          </div>
        `;

        const customIcon = L.divIcon({ html: markerHtml, className: 'incident-marker-icon', iconSize: [38, 38], iconAnchor: [19, 19] });
        const marker = L.marker([inc.lat, inc.lng], { icon: customIcon });

        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:240px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="background:${color}22; color:${color}; font-weight:800; font-size:10px; padding:2px 6px; border-radius:3px;">${inc.severity} SOS</span>
              <span style="font-size:10px; color:#64748b;">${inc.reportedTime}</span>
            </div>
            <h4 style="font-size:13px; margin:0 0 4px; color:#0f172a;">${inc.title}</h4>
            <div style="font-size:11px; color:#475569; margin-bottom:6px;">📍 ${inc.locationName} (${inc.nodeId || 'City Node'})</div>
            <div style="font-size:11px; background:#f8fafc; border:1px solid #e2e8f0; padding:6px; border-radius:4px; margin-bottom:8px;">
              <strong>Victims:</strong> ${inc.victims} at risk (${inc.victimsRescued} rescued)<br/>
              <strong>Needs:</strong> ${inc.requiredUnits ? inc.requiredUnits.join(', ') : 'Responder'}
            </div>
            <div style="display:flex; flex-direction:column; gap:5px;">
              <div style="display:flex; gap:6px;">
                <button onclick="window.rescueApp.assignNearestToIncident('${inc.id}')" style="flex:1; background:#0d9488; color:#fff; border:none; padding:6px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer;">
                  ⚡ Nearest (Dijkstra)
                </button>
                <button onclick="window.rescueApp.resolveIncident('${inc.id}')" style="flex:1; background:#7c3aed; color:#fff; border:none; padding:6px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer;">
                  ✓ Mark Resolved
                </button>
              </div>
              <button onclick="window.rescueApp.calculateSafeRouteToIncident('${inc.id}')" style="width:100%; background:#2563eb; color:#fff; border:none; padding:5px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer;">
                🗺️ Safe Route
              </button>
            </div>
          </div>
        `);

        this.markersGroup.addLayer(marker);
      });
    }

    // 4. Render Fleet Responders
    if (this.activeFilter === 'all' || this.activeFilter === 'units') {
      units.forEach(unit => {
        let iconEmoji = '🚑';
        let bgColor = '#0d9488';
        if (unit.type === 'RESCUE_BOAT') { iconEmoji = '🚤'; bgColor = '#0284c7'; }
        else if (unit.type === 'HEAVY_TRUCK') { iconEmoji = '🚒'; bgColor = '#ea580c'; }
        else if (unit.type === 'DRONE') { iconEmoji = '🛸'; bgColor = '#7c3aed'; }

        const isBusy = unit.status === 'EN_ROUTE' || unit.status === 'ON_SCENE' || unit.availability === 'EN_ROUTE';
        const borderColor = isBusy ? '#ef4444' : '#ffffff';
        const currentAvail = unit.availability || unit.status || 'AVAILABLE';

        const iconHtml = `
          <div style="background:${bgColor}; color:#fff; width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:2px solid ${borderColor}; font-size:17px;">
            ${iconEmoji}
          </div>
        `;
        const customIcon = L.divIcon({ html: iconHtml, className: 'unit-marker-icon', iconSize: [34, 34], iconAnchor: [17, 17] });
        const marker = L.marker([unit.lat, unit.lng], { icon: customIcon });

        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:220px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-weight:700; font-size:11px; color:#0f172a;">${unit.name}</span>
              <span style="font-size:9px; font-weight:700; padding:2px 6px; border-radius:3px; background:${isBusy ? '#fff7ed' : '#f0fdf4'}; color:${isBusy ? '#ea580c' : '#15803d'};">${currentAvail}</span>
            </div>
            <div style="font-size:11px; color:#64748b; margin-bottom:4px;">📍 <strong>Location:</strong> ${unit.location || unit.locationName} (${unit.nodeId || 'Node'})</div>
            <div style="font-size:11px; color:#334155; margin-bottom:6px;">
              <strong>Assigned:</strong> ${unit.assignedIncident || unit.targetIncidentId || 'None (Idle)'}<br/>
              <strong>Crew:</strong> ${unit.crewLead} | <strong>Fuel:</strong> ${unit.fuelPct}%
            </div>
            <div style="display:flex; gap:6px;">
              ${isBusy ? `
                <button onclick="window.rescueApp.makeResponderAvailable('${unit.id}')" style="flex:1; background:#0d9488; color:#fff; border:none; padding:6px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer;">
                  ✓ Free Responder
                </button>
              ` : `
                <button onclick="window.rescueApp.setRoutingOrigin('${unit.id}')" style="flex:1; background:#0f172a; color:#fff; border:none; padding:6px; font-size:11px; font-weight:600; border-radius:4px; cursor:pointer;">
                  Route From Unit
                </button>
              `}
            </div>
          </div>
        `);

        this.markersGroup.addLayer(marker);
      });
    }

    // 5. Render Active Missions / En-route lines
    this.renderActiveMissionRoutes();
  }

  renderActiveMissionRoutes() {
    const units = window.rescueStore.getUnits();
    const incidents = window.rescueStore.getIncidents();
    const hazards = window.rescueStore.getHazards();

    units.forEach(unit => {
      const assignedId = unit.assignedIncident || unit.targetIncidentId;
      if ((unit.status === 'EN_ROUTE' || unit.availability === 'EN_ROUTE') && assignedId) {
        const targetInc = incidents.find(i => i.id === assignedId);
        if (targetInc) {
          const routeRes = window.rescueRouting.computeOptimalRoute(
            { lat: unit.lat, lng: unit.lng },
            { lat: targetInc.lat, lng: targetInc.lng },
            hazards,
            unit.type,
            'SAFE'
          );

          const latLngs = routeRes.path.map(p => [p.lat, p.lng]);
          const polyline = L.polyline(latLngs, {
            color: '#14b8a6',
            weight: 5,
            opacity: 0.9,
            dashArray: '8, 8',
            lineCap: 'round'
          });

          polyline.bindPopup(`
            <div style="font-family:sans-serif; font-size:11px;">
              <strong>Active Safe Corridor:</strong> ${unit.name} ➡️ ${targetInc.title}<br/>
              <strong>ETA:</strong> ~${unit.currentEta || routeRes.etaMinutes} mins (${unit.lastDijkstraDistance || routeRes.distanceKm} km)<br/>
              <strong>Safety:</strong> ${routeRes.safetyScore}% hazard clearance
            </div>
          `);

          this.routesGroup.addLayer(polyline);
        }
      }
    });
  }

  /**
   * Requirement 9: Highlighted route visualization with route locations and distance
   */
  drawCalculatedPath(routeResult, startLabel, endLabel) {
    if (this.useFallback) {
      this.drawSvgCalculatedPath(routeResult);
      return;
    }
    if (!this.map || !this.routesGroup) return;

    this.routesGroup.clearLayers();
    // Re-add background active missions
    this.renderActiveMissionRoutes();

    const latLngs = routeResult.path.map(p => [p.lat, p.lng]);
    const routeColor = routeResult.safetyScore === 100 ? '#14b8a6' : (routeResult.safetyScore > 70 ? '#3b82f6' : '#ef4444');

    // Highlighted glowing polyline
    const polyline = L.polyline(latLngs, {
      color: routeColor,
      weight: 7,
      opacity: 0.95
    }).addTo(this.routesGroup);

    this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // Show AI notification toast
    const banner = document.getElementById('mapAiBanner');
    const msg = document.getElementById('mapAiMessage');
    if (banner && msg) {
      msg.textContent = `${routeResult.avoidanceNote || 'Shortest safe route'} | Distance: ${routeResult.distanceKm} km | ETA: ~${routeResult.etaMinutes} mins.`;
      banner.style.display = 'flex';
    }
  }

  /**
   * SVG Fallback Layer Renderer (Zero-dependency vector engine)
   */
  renderSvgFallbackLayers() {
    const roadLayer = document.getElementById('svgRoadNetworkLayer');
    const hazardsLayer = document.getElementById('svgHazardsLayer');
    const routesLayer = document.getElementById('svgRoutesLayer');
    const markersLayer = document.getElementById('svgMarkersLayer');
    if (!markersLayer) return;

    if (roadLayer) roadLayer.innerHTML = '';
    hazardsLayer.innerHTML = '';
    routesLayer.innerHTML = '';
    markersLayer.innerHTML = '';

    const incidents = window.rescueStore.getIncidents();
    const units = window.rescueStore.getUnits();
    const shelters = window.rescueStore.getShelters();
    const hazards = window.rescueStore.getHazards();

    // Road Network in SVG Fallback (Requirement 4)
    if (roadLayer && window.rescueRoadNetwork) {
      const edges = window.rescueRoadNetwork.getAllEdges();
      edges.forEach(e => {
        const nodeA = window.rescueRoadNetwork.getNode(e.from);
        const nodeB = window.rescueRoadNetwork.getNode(e.to);
        if (nodeA && nodeB) {
          const ptA = this.gpsToSvg(nodeA.lat, nodeA.lng);
          const ptB = this.gpsToSvg(nodeB.lat, nodeB.lng);
          const isBlocked = e.isBlocked;
          roadLayer.innerHTML += `
            <line x1="${ptA.x}" y1="${ptA.y}" x2="${ptB.x}" y2="${ptB.y}" stroke="${isBlocked ? '#ef4444' : '#334155'}" stroke-width="${isBlocked ? 3 : 1.5}" stroke-dasharray="${isBlocked ? '4,4' : 'none'}"/>
          `;
        }
      });
    }

    // Hazards
    hazards.forEach(h => {
      if (!h.active) return;
      const pt = this.gpsToSvg(h.lat, h.lng);
      hazardsLayer.innerHTML += `
        <circle cx="${pt.x}" cy="${pt.y}" r="32" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="2"/>
        <text x="${pt.x}" y="${pt.y + 4}" font-size="10" fill="#fca5a5" text-anchor="middle" font-weight="700">⚠️ HAZARD</text>
      `;
    });

    // Shelters
    shelters.forEach(s => {
      const pt = this.gpsToSvg(s.lat, s.lng);
      markersLayer.innerHTML += `
        <g style="cursor:pointer;" onclick="window.rescueApp.openEvacModalForShelter('${s.id}')">
          <circle cx="${pt.x}" cy="${pt.y}" r="16" fill="#7c3aed" stroke="#ffffff" stroke-width="2"/>
          <text x="${pt.x}" y="${pt.y + 5}" font-size="12" fill="#ffffff" text-anchor="middle">🏕️</text>
          <text x="${pt.x}" y="${pt.y + 26}" font-size="10" fill="#c4b5fd" text-anchor="middle" font-weight="600">${s.name.split(' ')[0]}</text>
        </g>
      `;
    });

    // Incidents
    incidents.forEach(inc => {
      if (inc.status === 'RESOLVED') return;
      const pt = this.gpsToSvg(inc.lat, inc.lng);
      const color = inc.severity === 'CRITICAL' ? '#ef4444' : '#f97316';
      markersLayer.innerHTML += `
        <g style="cursor:pointer;" onclick="window.rescueApp.openDispatchModalFor('${inc.id}')">
          <circle cx="${pt.x}" cy="${pt.y}" r="20" fill="${color}" fill-opacity="0.3"/>
          <circle cx="${pt.x}" cy="${pt.y}" r="14" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <text x="${pt.x}" y="${pt.y + 4}" font-size="11" fill="#ffffff" text-anchor="middle">🚨</text>
          <text x="${pt.x}" y="${pt.y - 18}" font-size="10" fill="#fca5a5" text-anchor="middle" font-weight="700">${inc.id} (${inc.victims}👥)</text>
        </g>
      `;
    });

    // Units
    units.forEach(u => {
      const pt = this.gpsToSvg(u.lat, u.lng);
      markersLayer.innerHTML += `
        <g style="cursor:pointer;" onclick="window.rescueApp.setRoutingOrigin('${u.id}')">
          <rect x="${pt.x - 14}" y="${pt.y - 14}" width="28" height="28" rx="6" fill="#0d9488" stroke="#ffffff" stroke-width="2"/>
          <text x="${pt.x}" y="${pt.y + 5}" font-size="12" fill="#ffffff" text-anchor="middle">🚑</text>
          <text x="${pt.x}" y="${pt.y + 26}" font-size="9" fill="#99f6e4" text-anchor="middle" font-weight="700">${u.name.split(' ')[1] || u.name}</text>
        </g>
      `;
    });
  }

  drawSvgCalculatedPath(routeResult) {
    const routesLayer = document.getElementById('svgRoutesLayer');
    if (!routesLayer) return;

    let dStr = '';
    routeResult.path.forEach((p, idx) => {
      const pt = this.gpsToSvg(p.lat, p.lng);
      if (idx === 0) dStr += `M ${pt.x} ${pt.y} `;
      else dStr += `L ${pt.x} ${pt.y} `;
    });

    routesLayer.innerHTML = `
      <path d="${dStr}" fill="none" stroke="#14b8a6" stroke-width="6" stroke-dasharray="8,4" stroke-linecap="round"/>
    `;
  }

  handleMapClick(lat, lng) {
    console.log(`Map clicked at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }

  setLayerFilter(filterType) {
    this.activeFilter = filterType;
    this.renderAllMapLayers();
  }

  recenter() {
    if (this.map) {
      this.map.setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], DEFAULT_COORDINATES.zoom);
    }
  }
}

window.rescueMap = new RescueMapController();
