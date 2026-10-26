/**
 * RescueRoute — Main Application Controller & UI Coordinator
 * Integrates:
 * 1. Priority Queue for Emergency Triage
 * 2. Dijkstra's Algorithm with Binary Min-Heap for Nearest Responder & Safe Route Optimization
 * 3. Interactive Incident Command & Responder Availability Management
 * 4. LocalStorage Persistence & Live Simulation Loop
 */

class RescueApp {
  constructor() {
    this.simRunning = true;
    this.simSeconds = 25920; // 07:12:00 AM
    this.simTimer = null;
    this.activeCalculatedRoute = null;
  }

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.startSimulationClock();
    this.refreshAllViews();

    // Initialize Map after DOM elements are ready
    setTimeout(() => {
      window.rescueMap.initMap();
    }, 150);

    // Initial Welcome Notification
    this.showToast("RescueRoute Command Center operational. Graph Network & Priority Queue active.", "success");
  }

  /* ================= NAVIGATION & VIEW SWITCHING ================= */
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Mobile sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebarOpenBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    if (openBtn) openBtn.addEventListener('click', () => sidebar.classList.add('open'));
    if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  switchTab(tabId) {
    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
    });

    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    // Close mobile drawer if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Invalidate map size so Leaflet renders correctly when switching back
    if (tabId === 'tab-dashboard' || tabId === 'tab-routing') {
      setTimeout(() => {
        if (window.rescueMap && window.rescueMap.map) {
          window.rescueMap.map.invalidateSize();
        }
      }, 100);
    }

    if (tabId === 'tab-dsa') {
      this.renderDsaView();
    }
  }

  /* ================= EVENT LISTENERS & CONTROLS ================= */
  setupEventListeners() {
    // Reset Demo Button
    const resetBtn = document.getElementById('resetDemoBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Reset demo data to initial factory disaster state? This restores all default incidents, responders, and shelters.")) {
          window.rescueStore.resetDemo();
          this.refreshAllViews();
          window.rescueMap.renderAllMapLayers();
          this.showToast("Demo data reloaded to baseline disaster state.", "success");
        }
      });
    }

    // Top Bar Quick Actions
    const topReportSosBtn = document.getElementById('topReportSosBtn');
    if (topReportSosBtn) {
      topReportSosBtn.addEventListener('click', () => this.openReportSosModal());
    }

    const injectEmergencyBtn = document.getElementById('injectEmergencyBtn');
    if (injectEmergencyBtn) {
      injectEmergencyBtn.addEventListener('click', () => this.injectSimulatedEmergency());
    }

    const assignNearestBtn = document.getElementById('assignNearestBtn');
    if (assignNearestBtn) {
      assignNearestBtn.addEventListener('click', () => this.assignNearestTopIncident());
    }

    const testSirenAlertBtn = document.getElementById('testSirenAlertBtn');
    if (testSirenAlertBtn) {
      testSirenAlertBtn.addEventListener('click', () => {
        const isActive = window.rescueAudio.toggleSiren();
        testSirenAlertBtn.classList.toggle('btn-danger', isActive);
        testSirenAlertBtn.classList.toggle('btn-outline-danger', !isActive);
        const text = document.getElementById('sirenBtnText');
        if (text) text.textContent = isActive ? "Stop Siren" : "Test Siren";
        if (isActive) this.showToast("Emergency siren sound activated!", "emergency");
      });
    }

    // Sound alert quick-buttons
    const soundBeepBtn = document.getElementById('soundBeepAlertBtn');
    if (soundBeepBtn) {
      soundBeepBtn.addEventListener('click', () => {
        window.rescueAudio.playWarningBeeps(4);
        this.showToast("Warning alert beeps transmitted.", "warning");
      });
    }

    const stopSirenBtn = document.getElementById('stopSoundSirenBtn');
    if (stopSirenBtn) {
      stopSirenBtn.addEventListener('click', () => {
        window.rescueAudio.stop();
        const text = document.getElementById('sirenBtnText');
        if (text) text.textContent = "Test Emergency Siren";
        this.showToast("Sirens silenced.", "success");
      });
    }

    // Modals setup
    this.setupModals();

    // Incident filters
    const incSev = document.getElementById('incidentSeverityFilter');
    const incType = document.getElementById('incidentTypeFilter');
    const incStat = document.getElementById('incidentStatusFilter');
    const clearIncFilters = document.getElementById('clearIncidentFilters');

    if (incSev) incSev.addEventListener('change', () => this.renderIncidentsView());
    if (incType) incType.addEventListener('change', () => this.renderIncidentsView());
    if (incStat) incStat.addEventListener('change', () => this.renderIncidentsView());
    if (clearIncFilters) {
      clearIncFilters.addEventListener('click', () => {
        incSev.value = "ALL";
        incType.value = "ALL";
        incStat.value = "ALL";
        this.renderIncidentsView();
      });
    }

    // Routing form
    const routingForm = document.getElementById('routingCalculatorForm');
    if (routingForm) {
      routingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.calculateAndDisplayRoute();
      });
    }

    // Dispatch along route button
    const dispatchAlongRouteBtn = document.getElementById('dispatchAlongCalculatedRouteBtn');
    if (dispatchAlongRouteBtn) {
      dispatchAlongRouteBtn.addEventListener('click', () => {
        this.dispatchFromRoutingWorkbench();
      });
    }

    // Supplies Restock
    const restockBtn = document.getElementById('restockAllSuppliesBtn');
    if (restockBtn) {
      restockBtn.addEventListener('click', () => {
        window.rescueStore.restockAllSupplies();
        this.renderSuppliesView();
        this.showToast("All warehouse depots restocked to maximum quota.", "success");
      });
    }

    // Bulletin Broadcast
    const bulletinForm = document.getElementById('broadcastBulletinForm');
    if (bulletinForm) {
      bulletinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('bulletinTitleInput').value.trim();
        const category = document.getElementById('bulletinCategoryInput').value;
        const message = document.getElementById('bulletinMessageInput').value.trim();

        if (!title || !message) {
          alert("Please fill in both title and announcement text.");
          return;
        }

        window.rescueStore.addBulletin({ title, category, message });
        bulletinForm.reset();
        this.renderBulletinsView();
        window.rescueAudio.playRadioChirp();
        this.showToast("Civic advisory alert broadcasted to population channels.", "warning");
      });
    }

    // Filter fleet units
    const fleetFilter = document.getElementById('fleetTypeFilter');
    if (fleetFilter) {
      fleetFilter.addEventListener('change', () => this.renderFleetUnitsView());
    }

    // Register unit button
    const openRegisterUnitBtn = document.getElementById('openRegisterUnitBtn');
    if (openRegisterUnitBtn) {
      openRegisterUnitBtn.addEventListener('click', () => this.openRegisterUnitModal());
    }

    // DSA Dijkstra simulator form
    const dsaForm = document.getElementById('dsaDijkstraTestForm');
    if (dsaForm) {
      dsaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runDsaDijkstraTest();
      });
    }
  }

  /* ================= MODAL WINDOW CONTROLLERS ================= */
  setupModals() {
    // Close modal utility
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-container');
        if (modal) modal.classList.remove('open');
      });
    });

    // Report SOS Modal
    const formReportSos = document.getElementById('formReportSos');
    if (formReportSos) {
      formReportSos.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleReportSosSubmit();
      });
    }

    const cancelReportSosBtn = document.getElementById('cancelReportSosBtn');
    if (cancelReportSosBtn) {
      cancelReportSosBtn.addEventListener('click', () => {
        document.getElementById('modalReportSos').classList.remove('open');
      });
    }

    // Manual Dispatch Modal
    const formManualDispatch = document.getElementById('formManualDispatch');
    if (formManualDispatch) {
      formManualDispatch.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleManualDispatchSubmit();
      });
    }

    const cancelManualDispatchBtn = document.getElementById('cancelManualDispatchBtn');
    if (cancelManualDispatchBtn) {
      cancelManualDispatchBtn.addEventListener('click', () => {
        document.getElementById('modalManualDispatch').classList.remove('open');
      });
    }

    // Assign Evacuees to Shelter Modal
    const formAssignEvacuees = document.getElementById('formAssignEvacuees');
    if (formAssignEvacuees) {
      formAssignEvacuees.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAssignEvacueesSubmit();
      });
    }

    const cancelAssignEvacueesBtn = document.getElementById('cancelAssignEvacueesBtn');
    if (cancelAssignEvacueesBtn) {
      cancelAssignEvacueesBtn.addEventListener('click', () => {
        document.getElementById('modalAssignEvacuees').classList.remove('open');
      });
    }

    // Register Unit Modal
    const formRegisterUnit = document.getElementById('formRegisterUnit');
    if (formRegisterUnit) {
      formRegisterUnit.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegisterUnitSubmit();
      });
    }

    const cancelRegisterUnitModalBtn = document.getElementById('cancelRegisterUnitModalBtn');
    if (cancelRegisterUnitModalBtn) {
      cancelRegisterUnitModalBtn.addEventListener('click', () => {
        document.getElementById('modalRegisterUnit').classList.remove('open');
      });
    }
  }

  openReportSosModal() {
    const modal = document.getElementById('modalReportSos');
    if (!modal) return;

    // Reset form
    document.getElementById('formReportSos').reset();
    document.getElementById('sosLatInput').value = "13.0450";
    document.getElementById('sosLngInput').value = "80.2250";

    modal.classList.add('open');
  }

  handleReportSosSubmit() {
    const title = document.getElementById('sosTitleInput').value.trim();
    const type = document.getElementById('sosTypeInput').value;
    const severity = document.getElementById('sosSeverityInput').value;
    const locationName = document.getElementById('sosLocationInput').value.trim();
    const sector = document.getElementById('sosSectorInput').value;
    const lat = parseFloat(document.getElementById('sosLatInput').value) || 13.045;
    const lng = parseFloat(document.getElementById('sosLngInput').value) || 80.225;
    const victims = parseInt(document.getElementById('sosVictimsInput').value, 10) || 1;
    const description = document.getElementById('sosDescInput').value.trim();

    // Required units check
    const requiredUnits = [];
    if (document.getElementById('reqAmbulance').checked) requiredUnits.push("AMBULANCE");
    if (document.getElementById('reqBoat').checked) requiredUnits.push("RESCUE_BOAT");
    if (document.getElementById('reqTruck').checked) requiredUnits.push("HEAVY_TRUCK");
    if (document.getElementById('reqDrone').checked) requiredUnits.push("RECON_DRONE");
    if (requiredUnits.length === 0) requiredUnits.push("AMBULANCE");

    // Associate nearest graph node ID
    const nearestNode = window.rescueRoadNetwork.findNearestNode(lat, lng);
    const nodeId = nearestNode ? nearestNode.id : "LOC_CENTRAL";

    const incidentData = {
      title,
      type,
      severity,
      locationName,
      sector,
      nodeId,
      lat,
      lng,
      victims,
      requiredUnits,
      description
    };

    const newInc = window.rescueStore.addIncident(incidentData);

    // Audio cue
    if (severity === "CRITICAL") {
      window.rescueAudio.playEmergencyBeep();
    } else {
      window.rescueAudio.playWarningBeeps(2);
    }

    // Close modal
    document.getElementById('modalReportSos').classList.remove('open');

    // Feedback
    this.showToast(`🚨 Priority Queue Enqueued: [${severity}] ${title}`, "emergency");

    // Refresh dashboard and map
    this.refreshAllViews();
    window.rescueMap.renderAllMapLayers();
  }

  openManualDispatchModal(incidentId) {
    const modal = document.getElementById('modalManualDispatch');
    const incident = window.rescueStore.getIncidents().find(i => i.id === incidentId);
    if (!incident || !modal) return;

    document.getElementById('dispatchIncidentIdHidden').value = incident.id;
    document.getElementById('dispatchIncidentSummary').innerHTML = `
      <div style="font-weight:700; color:var(--text-main); font-size:1.05rem;">${incident.title}</div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
        Location: <strong>${incident.locationName} (${incident.sector})</strong> | Severity: <span class="badge badge-${incident.severity.toLowerCase()}">${incident.severity}</span> | Victims: <strong>${incident.victims}</strong>
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${incident.description}</div>
    `;

    // Populate recommendation list using Dijkstra
    const recs = window.rescueDispatcher.getRecommendationsForIncident(incident.id);
    const container = document.getElementById('dispatchUnitRecommendationList');

    if (recs.length === 0) {
      container.innerHTML = `<div class="empty-state">No response units currently available in fleet. Mark active missions as resolved.</div>`;
    } else {
      container.innerHTML = recs.map((rec, index) => {
        const isBest = index === 0;
        return `
          <label class="recommendation-option ${isBest ? 'best-choice' : ''}" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-bottom:8px; cursor:pointer; background:${isBest ? '#f0fdf4' : 'var(--bg-card)'};">
            <input type="radio" name="selectedDispatchUnit" value="${rec.unit.id}" ${isBest ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--accent-teal);">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:var(--text-main);">${rec.unit.callSign} (${rec.unit.type})</span>
                <span style="font-size:0.8rem; font-weight:700; color:var(--accent-teal);">Match Score: ${rec.score}%</span>
              </div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                Base: ${rec.unit.baseLocation} | Dijkstra Distance: <strong>${rec.distanceKm} km</strong> | Est. Arrival: <strong>~${rec.estMinutes} mins</strong> | Crew: ${rec.unit.crewCount}
              </div>
            </div>
          </label>
        `;
      }).join('');
    }

    modal.classList.add('open');
  }

  handleManualDispatchSubmit() {
    const incidentId = document.getElementById('dispatchIncidentIdHidden').value;
    const selectedRadio = document.querySelector('input[name="selectedDispatchUnit"]:checked');

    if (!selectedRadio) {
      alert("Please select a responder unit to dispatch.");
      return;
    }

    const unitId = selectedRadio.value;
    const safetyMode = document.getElementById('dispatchSafetyMode').value;
    const note = document.getElementById('dispatchNotesInput').value.trim();

    const result = window.rescueDispatcher.dispatchUnit(unitId, incidentId, safetyMode, note);

    if (result.success) {
      document.getElementById('modalManualDispatch').classList.remove('open');
      window.rescueAudio.playRadioChirp();

      this.showToast(`✅ Dispatched ${result.unit.callSign} to ${result.incident.title} (Route: ${result.route.distanceKm} km)`, "success");

      // Draw route on map
      window.rescueMap.drawCalculatedPath(result.route.waypoints, result.route.color);

      this.refreshAllViews();
      window.rescueMap.renderAllMapLayers();
    } else {
      alert(result.message);
    }
  }

  openEvacueeModal(shelterId) {
    const modal = document.getElementById('modalAssignEvacuees');
    const shelter = window.rescueStore.getShelters().find(s => s.id === shelterId);
    if (!shelter || !modal) return;

    const availableSpace = shelter.capacity - shelter.occupied;
    document.getElementById('shelterAssignIdHidden').value = shelter.id;
    document.getElementById('shelterAssignNameDisplay').textContent = shelter.name;
    document.getElementById('shelterAvailableSpaceDisplay').textContent = `${availableSpace} spaces available (Capacity: ${shelter.capacity})`;

    const countInput = document.getElementById('evacueeCountInput');
    countInput.max = availableSpace;
    countInput.value = Math.min(10, availableSpace);

    modal.classList.add('open');
  }

  handleAssignEvacueesSubmit() {
    const shelterId = document.getElementById('shelterAssignIdHidden').value;
    const count = parseInt(document.getElementById('evacueeCountInput').value, 10) || 0;
    const origin = document.getElementById('evacueeOriginInput').value.trim();

    const result = window.rescueDispatcher.transferEvacueesToShelter(shelterId, count, origin);

    if (result.success) {
      document.getElementById('modalAssignEvacuees').classList.remove('open');
      this.showToast(`Admitted ${count} evacuees to ${result.shelter.name}.`, "success");
      this.refreshAllViews();
      window.rescueMap.renderAllMapLayers();
    } else {
      alert(result.message);
    }
  }

  openRegisterUnitModal() {
    const modal = document.getElementById('modalRegisterUnit');
    if (!modal) return;
    document.getElementById('formRegisterUnit').reset();
    modal.classList.add('open');
  }

  handleRegisterUnitSubmit() {
    const callSign = document.getElementById('newUnitCallSign').value.trim();
    const type = document.getElementById('newUnitType').value;
    const baseLocation = document.getElementById('newUnitBaseLocation').value.trim();
    const lat = parseFloat(document.getElementById('newUnitLat').value) || 13.0827;
    const lng = parseFloat(document.getElementById('newUnitLng').value) || 80.2707;
    const crewCount = parseInt(document.getElementById('newUnitCrew').value, 10) || 3;
    const capacityVictims = parseInt(document.getElementById('newUnitCapacity').value, 10) || 4;

    const nearestNode = window.rescueRoadNetwork.findNearestNode(lat, lng);
    const nodeId = nearestNode ? nearestNode.id : "LOC_CENTRAL";

    const unitData = {
      callSign,
      type,
      baseLocation,
      nodeId,
      lat,
      lng,
      crewCount,
      capacityVictims,
      speedKmH: type === "RECON_DRONE" ? 70 : (type === "RESCUE_BOAT" ? 30 : 50),
      fuelPct: 100,
      status: "AVAILABLE",
      availability: "AVAILABLE",
      assignedIncidentId: null,
      assignedIncidentTitle: null
    };

    window.rescueStore.addUnit(unitData);
    document.getElementById('modalRegisterUnit').classList.remove('open');

    this.showToast(`Responder ${callSign} registered and stationed at ${baseLocation}.`, "success");
    this.refreshAllViews();
    window.rescueMap.renderAllMapLayers();
  }

  /* ================= AUTOMATIC NEAREST RESPONDER ASSIGNMENT ================= */
  assignNearestTopIncident() {
    const prioritized = window.rescueDispatcher.getPrioritizedPendingIncidents();
    if (prioritized.length === 0) {
      this.showToast("No pending incidents in Priority Queue.", "warning");
      return;
    }

    const topIncident = prioritized[0];
    this.assignNearestToIncident(topIncident.id);
  }

  assignNearestToIncident(incidentId) {
    const incident = window.rescueStore.getIncidents().find(i => i.id === incidentId);
    if (!incident) return;

    const recs = window.rescueDispatcher.getRecommendationsForIncident(incident.id);
    if (recs.length === 0) {
      this.showToast(`No available responder units to assign to ${incident.title}. Free a busy responder first.`, "emergency");
      return;
    }

    // Top choice computed by Dijkstra shortest path
    const bestChoice = recs[0];
    const result = window.rescueDispatcher.dispatchUnit(bestChoice.unit.id, incident.id, "SAFE", "Automated Dijkstra nearest-responder dispatch");

    if (result.success) {
      window.rescueAudio.playRadioChirp();
      this.showToast(`⚡ Assigned nearest responder ${result.unit.callSign} to [${incident.severity}] ${incident.title} (Distance: ${result.route.distanceKm} km)`, "success");

      // Draw path on both Leaflet and SVG fallback
      window.rescueMap.drawCalculatedPath(result.route.waypoints, result.route.color);
      if (result.dijkstraRes && result.dijkstraRes.path) {
        window.rescueMap.drawSvgCalculatedPath(result.dijkstraRes.path, result.route.color);
      }

      this.refreshAllViews();
      window.rescueMap.renderAllMapLayers();
    }
  }

  /* ================= RESOLVE INCIDENT & FREE RESPONDERS ================= */
  resolveIncident(incidentId) {
    const result = window.rescueStore.resolveIncident(incidentId);
    if (result.success) {
      this.showToast(`Incident marked resolved! Responder ${result.unit ? result.unit.callSign : 'unit'} is now AVAILABLE.`, "success");
      this.refreshAllViews();
      window.rescueMap.renderAllMapLayers();
    }
  }

  makeResponderAvailable(unitId) {
    const result = window.rescueStore.makeResponderAvailable(unitId);
    if (result.success) {
      this.showToast(`Responder ${result.unit.callSign} returned to ready AVAILABLE status.`, "success");
      this.refreshAllViews();
      window.rescueMap.renderAllMapLayers();
    }
  }

  injectSimulatedEmergency() {
    const scenarios = [
      {
        title: "Hospital Basement Flooding & Generator Threat",
        type: "FLOOD",
        severity: "CRITICAL",
        locationName: "Kilpauk Medical Center Annex",
        sector: "Metro Center",
        lat: 13.0780,
        lng: 80.2410,
        victims: 9,
        requiredUnits: ["RESCUE_BOAT", "AMBULANCE"],
        description: "Backflow from storm drain entering critical dialysis unit basement. Power pumps failing."
      },
      {
        title: "Industrial Storage Warehouse Chemical Vapor Leak",
        type: "CHEMICAL",
        severity: "HIGH",
        locationName: "Guindy Industrial Estate, Phase 3",
        sector: "Industrial Hub",
        lat: 13.0090,
        lng: 80.2030,
        victims: 6,
        requiredUnits: ["HEAVY_TRUCK", "AMBULANCE"],
        description: "Ruptured cylinder releasing ammonia vapor. 200m evacuation perimeter requested."
      },
      {
        title: "Pedestrian Suspension Walkway Structural Instability",
        type: "COLLAPSE",
        severity: "HIGH",
        locationName: "Adyar Park Gate Crossing",
        sector: "River Bridge",
        lat: 13.0270,
        lng: 80.2550,
        victims: 4,
        requiredUnits: ["HEAVY_TRUCK"],
        description: "Scouring beneath eastern pylon detected by sensors. Multiple pedestrians stranded on deck."
      }
    ];

    const pick = scenarios[Math.floor(Math.random() * scenarios.length)];
    const incidents = window.rescueStore.getIncidents();
    const nearestNode = window.rescueRoadNetwork.findNearestNode(pick.lat, pick.lng);

    const newInc = {
      id: "INC_" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      title: pick.title,
      type: pick.type,
      severity: pick.severity,
      locationName: pick.locationName,
      sector: pick.sector,
      nodeId: nearestNode ? nearestNode.id : "LOC_CENTRAL",
      lat: pick.lat,
      lng: pick.lng,
      victims: pick.victims,
      victimsRescued: 0,
      requiredUnits: pick.requiredUnits,
      description: pick.description,
      status: "PENDING",
      assignedUnitId: null,
      reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priorityScore: 92
    };

    incidents.unshift(newInc);
    window.rescueStore.saveIncidents(incidents);
    window.rescueStore.logAction("SOS_INJECTED", newInc.id, `Simulated emergency: ${newInc.title}`, "Simulation AI");
    window.rescueAudio.playWarningBeeps(2);

    this.showToast(`🚨 New SOS Registered: ${newInc.title}!`, "emergency");
    this.refreshAllViews();
    window.rescueMap.renderAllMapLayers();
  }

  /* ================= VIEW REFRESH & DATA POPULATION ================= */
  refreshAllViews() {
    // Synchronize road network blocked edges with current hazards
    if (window.rescueRoadNetwork && window.rescueStore) {
      window.rescueRoadNetwork.syncWithHazards(window.rescueStore.getHazards());
    }

    this.updateKpis();
    this.renderAiRecommendations();
    this.renderActivityLog();
    this.renderActiveMissionsTable();
    this.renderIncidentsView();
    this.renderRoutingFormDropdowns();
    this.renderFleetUnitsView();
    this.renderSuppliesView();
    this.renderSheltersView();
    this.renderBulletinsView();
    this.renderAuditLogTable();
    this.renderHazardToggles();
  }

  updateKpis() {
    const incidents = window.rescueStore.getIncidents();
    const units = window.rescueStore.getUnits();
    const shelters = window.rescueStore.getShelters();

    const activeInc = incidents.filter(i => i.status !== 'RESOLVED');
    const criticalInc = activeInc.filter(i => i.severity === 'CRITICAL');
    const pendingInc = incidents.filter(i => i.status === 'PENDING');
    const resolvedInc = incidents.filter(i => i.status === 'RESOLVED');

    const totalVictims = activeInc.reduce((sum, i) => sum + (i.victims || 0), 0);
    const deployedUnits = units.filter(u => u.status === 'DISPATCHED' || u.status === 'EN_ROUTE');
    const availableUnits = units.filter(u => u.status === 'AVAILABLE' || u.availability === 'AVAILABLE');

    // 4 Key Dashboard Cards
    const kpiTotal = document.getElementById('kpiTotalIncidents');
    if (kpiTotal) kpiTotal.textContent = incidents.length;

    const kpiCritical = document.getElementById('kpiCriticalIncidents');
    if (kpiCritical) kpiCritical.textContent = criticalInc.length;

    const kpiAvailable = document.getElementById('kpiAvailableResponders');
    if (kpiAvailable) kpiAvailable.textContent = `${availableUnits.length} / ${units.length}`;

    const kpiResolved = document.getElementById('kpiResolvedIncidents');
    if (kpiResolved) kpiResolved.textContent = resolvedInc.length;

    // Sidebar status
    const alertLevel = document.getElementById('systemAlertLevel');
    if (alertLevel) {
      if (criticalInc.length >= 2) {
        alertLevel.className = 'threat-pill critical';
        alertLevel.textContent = 'RED ALERT';
      } else if (activeInc.length > 0) {
        alertLevel.className = 'threat-pill warning';
        alertLevel.textContent = 'ELEVATED';
      } else {
        alertLevel.className = 'threat-pill safe';
        alertLevel.textContent = 'NORMAL';
      }
    }

    const activeIncEl = document.getElementById('activeIncidentsCount');
    if (activeIncEl) activeIncEl.textContent = activeInc.length;

    const critVictimsEl = document.getElementById('criticalVictimsCount');
    if (critVictimsEl) critVictimsEl.textContent = totalVictims;

    const deployedUnitsEl = document.getElementById('unitsDeployedCount');
    if (deployedUnitsEl) deployedUnitsEl.textContent = deployedUnits.length;
  }

  renderAiRecommendations() {
    const container = document.getElementById('aiRecommendationsFeed');
    if (!container) return;

    const prioritized = window.rescueDispatcher.getPrioritizedPendingIncidents();

    if (prioritized.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:36px; height:36px; margin:0 auto 10px; color:var(--text-muted);"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          <div style="font-weight:600; color:var(--text-main);">Priority Queue Clear</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">No unassigned life-threatening distress calls pending.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = prioritized.slice(0, 3).map((incident, idx) => {
      const recs = window.rescueDispatcher.getRecommendationsForIncident(incident.id);
      const topRec = recs.length > 0 ? recs[0] : null;

      return `
        <div class="recommendation-item">
          <div class="recommendation-header">
            <span class="recommendation-target" style="display:flex; align-items:center; gap:6px;">
              <span class="badge badge-${incident.severity.toLowerCase()}">${incident.severity}</span>
              #${idx + 1} Queue Priority
            </span>
            <span class="confidence-tag">${topRec ? topRec.score + '% Match' : 'No Responders'}</span>
          </div>
          <div class="recommendation-body">
            <strong>${incident.title}</strong><br>
            ${incident.locationName} (${incident.sector}) • ${incident.victims} victims at risk.<br>
            ${topRec 
              ? `<span style="color:var(--accent-teal); font-weight:600;">Optimal Dispatch: ${topRec.unit.callSign} (${topRec.unit.type}) ~${topRec.distanceKm} km (Est: ${topRec.estMinutes}m)</span>` 
              : `<span style="color:var(--accent-orange);">All rescue units deployed. Await mission completion.</span>`}
          </div>
          <div class="recommendation-actions">
            ${topRec ? `
              <button class="btn btn-teal btn-sm" onclick="window.rescueApp.assignNearestToIncident('${incident.id}')">
                ⚡ Dispatch Nearest (${topRec.unit.callSign})
              </button>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="window.rescueApp.openManualDispatchModal('${incident.id}')">
              Review Fleet Options
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderActivityLog() {
    const container = document.getElementById('recentActivityFeed');
    if (!container) return;

    const logs = window.rescueStore.getAuditLogs().slice(0, 7);
    container.innerHTML = logs.map(log => {
      let iconColor = 'var(--accent-blue)';
      if (log.action.includes('DISPATCH')) iconColor = 'var(--accent-teal)';
      if (log.action.includes('CRITICAL') || log.action.includes('SOS')) iconColor = 'var(--accent-red)';
      if (log.action.includes('RESOLVED')) iconColor = '#10b981';

      return `
        <div class="activity-item">
          <div class="activity-time">${log.time}</div>
          <div class="activity-desc" style="border-left:2px solid ${iconColor}; padding-left:8px;">
            <strong>${log.actor}</strong>: ${log.details}
          </div>
        </div>
      `;
    }).join('');
  }

  renderActiveMissionsTable() {
    const tbody = document.getElementById('activeMissionsTableBody');
    if (!tbody) return;

    const incidents = window.rescueStore.getIncidents();
    const units = window.rescueStore.getUnits();
    const activeMissions = incidents.filter(i => i.status === 'DISPATCHED' || i.status === 'EN_ROUTE');

    if (activeMissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--text-muted);">No active response missions currently in transit.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeMissions.map(inc => {
      const assignedUnit = units.find(u => u.id === inc.assignedUnitId);
      return `
        <tr>
          <td><strong>${inc.id}</strong></td>
          <td>
            <div style="font-weight:600; color:var(--text-main);">${inc.title}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${inc.locationName} (${inc.sector})</div>
          </td>
          <td><span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span></td>
          <td>${assignedUnit ? `<strong>${assignedUnit.callSign}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${assignedUnit.type})</span>` : 'Pending Match'}</td>
          <td><span class="status-indicator status-orange"></span> In Transit</td>
          <td class="text-right">
            <button class="btn btn-outline btn-sm" onclick="window.rescueApp.resolveIncident('${inc.id}')">
              Mark Resolved
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ================= INCIDENTS TAB VIEW ================= */
  renderIncidentsView() {
    const listContainer = document.getElementById('incidentCardsList');
    if (!listContainer) return;

    const incidents = window.rescueStore.getIncidents();
    const sevFilter = document.getElementById('incidentSeverityFilter')?.value || "ALL";
    const typeFilter = document.getElementById('incidentTypeFilter')?.value || "ALL";
    const statFilter = document.getElementById('incidentStatusFilter')?.value || "ALL";

    // Use Priority Queue for sorting pending calls
    const pendingIncidents = incidents.filter(i => i.status === "PENDING");
    window.rescuePriorityQueue.rebuild(pendingIncidents);
    const sortedPending = window.rescuePriorityQueue.toArray();

    const otherIncidents = incidents.filter(i => i.status !== "PENDING");
    const combined = [...sortedPending, ...otherIncidents];

    const filtered = combined.filter(inc => {
      if (sevFilter !== "ALL" && inc.severity !== sevFilter) return false;
      if (typeFilter !== "ALL" && inc.type !== typeFilter) return false;
      if (statFilter !== "ALL" && inc.status !== statFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No emergency incidents match the active filter criteria.</div>`;
      return;
    }

    listContainer.innerHTML = filtered.map(inc => {
      const isResolved = inc.status === "RESOLVED";
      const isDispatched = inc.status === "DISPATCHED";

      return `
        <div class="incident-card ${inc.severity.toLowerCase()} ${isResolved ? 'resolved-card' : ''}">
          <div class="incident-header">
            <div>
              <span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span>
              <span class="badge" style="background:#e2e8f0; color:#334155; margin-left:6px;">${inc.type}</span>
            </div>
            <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">${inc.reportedTime}</span>
          </div>

          <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">${inc.title}</h3>
          
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">
            📍 <strong>${inc.locationName}</strong> (${inc.sector}) • Node: <code>${inc.nodeId || 'N/A'}</code>
          </div>

          <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:12px; line-height:1.4;">
            ${inc.description}
          </p>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding-top:8px; border-top:1px solid var(--border-color); margin-bottom:12px;">
            <span>Victims at risk: <strong>${inc.victims}</strong></span>
            <span>Status: <strong style="color:${isResolved ? '#10b981' : (isDispatched ? 'var(--accent-orange)' : 'var(--accent-red)')};">${inc.status}</strong></span>
          </div>

          <div class="incident-card-actions" style="display:flex; gap:8px;">
            ${!isResolved ? `
              <button class="btn btn-teal btn-sm" style="flex:1;" onclick="window.rescueApp.assignNearestToIncident('${inc.id}')">
                ⚡ Dispatch Nearest
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.rescueApp.openManualDispatchModal('${inc.id}')">
                Options
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.rescueApp.resolveIncident('${inc.id}')" title="Resolve incident and release assigned responder">
                ✓ Resolve
              </button>
            ` : `
              <span style="font-size:0.85rem; color:#10b981; font-weight:700; padding:4px 0;">✓ Mission Resolved & Secured</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  /* ================= FLEET / RESPONDERS TAB VIEW ================= */
  renderFleetUnitsView() {
    const container = document.getElementById('fleetUnitsGrid');
    if (!container) return;

    const units = window.rescueStore.getUnits();
    const typeFilter = document.getElementById('fleetTypeFilter')?.value || "ALL";

    const filtered = units.filter(u => {
      if (typeFilter !== "ALL" && u.type !== typeFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No fleet units match the filter criteria.</div>`;
      return;
    }

    container.innerHTML = filtered.map(unit => {
      const isAvailable = unit.status === "AVAILABLE" || unit.availability === "AVAILABLE";

      return `
        <div class="fleet-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <span style="font-size:1.1rem; font-weight:800; color:var(--text-main);">${unit.callSign}</span>
              <div style="font-size:0.8rem; color:var(--text-muted);">${unit.type} • Node: <code>${unit.nodeId || 'LOC_CENTRAL'}</code></div>
            </div>
            <span class="status-indicator ${isAvailable ? 'status-green' : 'status-orange'}" title="${unit.status}"></span>
          </div>

          <div style="font-size:0.85rem; color:var(--text-main); margin-bottom:12px;">
            <div>Station: <strong>${unit.baseLocation}</strong></div>
            <div>Crew: <strong>${unit.crewCount} personnel</strong> • Capacity: <strong>${unit.capacityVictims} victims</strong></div>
            <div>Fuel Level: <strong>${unit.fuelPct}%</strong> • Speed: <strong>${unit.speedKmH} km/h</strong></div>
          </div>

          <div style="padding-top:10px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.8rem; font-weight:700; color:${isAvailable ? '#10b981' : 'var(--accent-orange)'};">
              ${isAvailable ? 'READY FOR DISPATCH' : `ASSIGNED (${unit.assignedIncidentId || 'Mission'})`}
            </span>
            ${!isAvailable ? `
              <button class="btn btn-outline btn-sm" onclick="window.rescueApp.makeResponderAvailable('${unit.id}')">
                Make Available
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /* ================= ROUTING CALCULATOR TAB ================= */
  renderRoutingFormDropdowns() {
    const originSelect = document.getElementById('routeOriginSelect');
    const destSelect = document.getElementById('routeDestinationSelect');

    if (!originSelect || !destSelect) return;

    const nodes = window.rescueRoadNetwork ? window.rescueRoadNetwork.getAllNodes() : [];

    const optionsHtml = nodes.map(n => `<option value="${n.id}">${n.name} (${n.id})</option>`).join('');

    originSelect.innerHTML = optionsHtml;
    destSelect.innerHTML = optionsHtml;

    if (nodes.length > 2) {
      originSelect.selectedIndex = 0; // Central Station
      destSelect.selectedIndex = 3;   // Velachery
    }
  }

  calculateAndDisplayRoute() {
    const originNodeId = document.getElementById('routeOriginSelect').value;
    const destNodeId = document.getElementById('routeDestinationSelect').value;
    const avoidHazards = document.getElementById('routeAvoidHazardsCheckbox').checked;

    if (originNodeId === destNodeId) {
      alert("Origin and destination must be different road intersections.");
      return;
    }

    // Run Dijkstra's Algorithm using Binary Min-Heap
    const result = window.rescueRoadNetwork.dijkstra(originNodeId, destNodeId, avoidHazards);

    const summaryBox = document.getElementById('routeCalculationSummary');
    const pathNodesContainer = document.getElementById('routeNodesSequence');

    if (!result.success) {
      summaryBox.innerHTML = `
        <div class="alert alert-danger" style="margin-bottom:12px;">
          ❌ No accessible route found! All path corridors between these nodes are severed by active roadblocks.
        </div>
      `;
      pathNodesContainer.innerHTML = '';
      return;
    }

    this.activeCalculatedRoute = result;

    summaryBox.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
        <div style="background:#f1f5f9; padding:10px; border-radius:var(--radius-sm); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">TOTAL DISTANCE</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-teal);">${result.distance} km</div>
        </div>
        <div style="background:#f1f5f9; padding:10px; border-radius:var(--radius-sm); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">INTERSECTIONS</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-blue);">${result.path.length} hops</div>
        </div>
        <div style="background:#f1f5f9; padding:10px; border-radius:var(--radius-sm); text-align:center;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">EST. AMBULANCE ETA</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--text-main);">~${Math.round((result.distance / 45) * 60)} min</div>
        </div>
      </div>
    `;

    // Render sequence of road hops
    pathNodesContainer.innerHTML = result.path.map((nodeId, idx) => {
      const node = window.rescueRoadNetwork.getNode(nodeId);
      const isLast = idx === result.path.length - 1;
      return `
        <div class="route-node-pill" style="display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); border:1px solid var(--border-color); padding:6px 12px; border-radius:20px; font-size:0.85rem; margin-right:6px; margin-bottom:6px;">
          <span style="font-weight:700; color:var(--accent-teal);">${idx + 1}.</span>
          <span>${node ? node.name : nodeId}</span>
          ${!isLast ? `<span style="color:var(--text-muted);">→</span>` : '🏁'}
        </div>
      `;
    }).join('');

    // Highlight path on map
    const coords = result.path.map(nId => {
      const n = window.rescueRoadNetwork.getNode(nId);
      return [n.lat, n.lng];
    });

    window.rescueMap.drawCalculatedPath(coords, "#0ea5e9");
    window.rescueMap.drawSvgCalculatedPath(result.path, "#0ea5e9");

    this.showToast(`Dijkstra Route Computed: ${result.distance} km across ${result.path.length} intersections.`, "success");
  }

  dispatchFromRoutingWorkbench() {
    if (!this.activeCalculatedRoute) {
      alert("Please calculate an optimal route first.");
      return;
    }

    const units = window.rescueStore.getUnits().filter(u => u.status === "AVAILABLE" || u.availability === "AVAILABLE");
    if (units.length === 0) {
      alert("No available responder units in fleet.");
      return;
    }

    const unit = units[0];
    unit.status = "DISPATCHED";
    unit.availability = "DISPATCHED";
    window.rescueStore.saveUnits(window.rescueStore.getUnits());
    window.rescueStore.logAction("ROUTE_DISPATCH", unit.id, `Manual route dispatch deployed along computed Dijkstra corridor`, "Dispatcher");

    this.showToast(`Unit ${unit.callSign} mobilized along calculated route corridor.`, "success");
    this.refreshAllViews();
  }

  /* ================= SHELTERS TAB VIEW ================= */
  renderSheltersView() {
    const container = document.getElementById('sheltersGrid');
    if (!container) return;

    const shelters = window.rescueStore.getShelters();
    container.innerHTML = shelters.map(s => {
      const pct = Math.round((s.occupied / s.capacity) * 100);
      let statusColor = '#10b981';
      if (pct > 75) statusColor = 'var(--accent-orange)';
      if (pct >= 100) statusColor = 'var(--accent-red)';

      return `
        <div class="shelter-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-main);">${s.name}</h3>
              <div style="font-size:0.8rem; color:var(--text-muted);">${s.address}</div>
            </div>
            <span class="badge" style="background:#f1f5f9; color:var(--text-main); font-weight:700;">${pct}% Full</span>
          </div>

          <div class="progress-bar-container" style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden; margin:10px 0;">
            <div style="background:${statusColor}; width:${Math.min(100, pct)}%; height:100%;"></div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-main); margin-bottom:12px;">
            <span>Occupancy: <strong>${s.occupied} / ${s.capacity}</strong></span>
            <span>Medical: <strong>${s.hasMedical ? 'Doctor on site' : 'First Aid'}</strong></span>
          </div>

          <button class="btn btn-outline btn-sm" style="width:100%;" onclick="window.rescueApp.openEvacueeModal('${s.id}')">
            + Transfer Evacuees to Shelter
          </button>
        </div>
      `;
    }).join('');
  }

  /* ================= SUPPLIES TAB VIEW ================= */
  renderSuppliesView() {
    const container = document.getElementById('suppliesGrid');
    if (!container) return;

    const supplies = window.rescueStore.getSupplies();
    container.innerHTML = supplies.map(sup => {
      const pct = Math.round((sup.quantity / sup.maxCapacity) * 100);
      return `
        <div class="supply-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-weight:700; color:var(--text-main); font-size:1rem;">${sup.name}</span>
            <span class="badge" style="background:#e2e8f0; color:#334155;">${sup.category}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Warehouse: ${sup.depotLocation}</div>
          <div class="progress-bar-container" style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden; margin-bottom:8px;">
            <div style="background:var(--accent-teal); width:${Math.min(100, pct)}%; height:100%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-main);">
            <span>Stock: <strong>${sup.quantity} ${sup.unit}</strong></span>
            <span>Capacity: <strong>${sup.maxCapacity} ${sup.unit}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ================= BULLETINS & AUDIT LOG TAB ================= */
  renderBulletinsView() {
    const container = document.getElementById('bulletinsList');
    if (!container) return;

    const bulletins = window.rescueStore.getBulletins();
    container.innerHTML = bulletins.map(b => `
      <div class="bulletin-card" style="background:var(--bg-card); border-left:4px solid var(--accent-red); padding:14px; border-radius:var(--radius-sm); margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:700; color:var(--text-main);">${b.title}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${b.timestamp}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-main); line-height:1.4;">${b.message}</p>
      </div>
    `).join('');
  }

  renderAuditLogTable() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;

    const logs = window.rescueStore.getAuditLogs();
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><code>${l.id}</code></td>
        <td>${l.time}</td>
        <td><span class="badge" style="background:#e2e8f0; color:#0f172a;">${l.action}</span></td>
        <td>${l.targetId || '-'}</td>
        <td>${l.details}</td>
        <td><strong>${l.actor}</strong></td>
      </tr>
    `).join('');
  }

  /* ================= HAZARD TOGGLES IN MAP WORKBENCH ================= */
  renderHazardToggles() {
    const container = document.getElementById('hazardsTogglesList');
    if (!container) return;

    const hazards = window.rescueStore.getHazards();
    container.innerHTML = hazards.map(h => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color);">
        <div>
          <div style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${h.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${h.type} • Impact: ${h.radiusMeters}m</div>
        </div>
        <label class="switch" style="position:relative; display:inline-block; width:38px; height:22px;">
          <input type="checkbox" ${h.active ? 'checked' : ''} onchange="window.rescueApp.toggleHazard('${h.id}', this.checked)" style="opacity:0; width:0; height:0;">
          <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${h.active ? 'var(--accent-red)' : '#cbd5e1'}; border-radius:22px; transition:.3s;"></span>
        </label>
      </div>
    `).join('');
  }

  toggleHazard(hazardId, isActive) {
    const hazards = window.rescueStore.getHazards();
    const hazard = hazards.find(h => h.id === hazardId);
    if (!hazard) return;

    hazard.active = isActive;
    window.rescueStore.saveHazards(hazards);

    // Sync graph network edge blockage state
    if (hazard.nodeA && hazard.nodeB) {
      window.rescueRoadNetwork.setRoadBlock(hazard.nodeA, hazard.nodeB, isActive);
    }

    this.showToast(`Hazard roadblock ${hazard.title} ${isActive ? 'ACTIVATED' : 'CLEARED'}.`, isActive ? "emergency" : "success");
    this.refreshAllViews();
    window.rescueMap.renderAllMapLayers();
  }

  /* ================= DSA INSIGHTS INTERACTIVE DEMO ================= */
  renderDsaView() {
    const sourceSelect = document.getElementById('dsaDijkstraSourceSelect');
    const targetSelect = document.getElementById('dsaDijkstraTargetSelect');

    if (sourceSelect && targetSelect && sourceSelect.options.length === 0) {
      const nodes = window.rescueRoadNetwork.getAllNodes();
      const options = nodes.map(n => `<option value="${n.id}">${n.name} (${n.id})</option>`).join('');
      sourceSelect.innerHTML = options;
      targetSelect.innerHTML = options;

      if (nodes.length > 2) {
        sourceSelect.selectedIndex = 2; // Guindy
        targetSelect.selectedIndex = 5; // Adyar
      }
    }

    // Populate live priority queue state table
    const pqTbody = document.getElementById('dsaPqInspectorTbody');
    if (pqTbody) {
      const prioritized = window.rescueDispatcher.getPrioritizedPendingIncidents();
      if (prioritized.length === 0) {
        pqTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--text-muted);">Priority Queue is currently empty.</td></tr>`;
      } else {
        pqTbody.innerHTML = prioritized.map((inc, rank) => `
          <tr>
            <td><strong>#${rank + 1}</strong></td>
            <td><span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span></td>
            <td><strong>${inc.title}</strong></td>
            <td>${inc.victims} victims</td>
            <td><code>${inc.nodeId || 'N/A'}</code></td>
          </tr>
        `).join('');
      }
    }
  }

  runDsaDijkstraTest() {
    const source = document.getElementById('dsaDijkstraSourceSelect').value;
    const target = document.getElementById('dsaDijkstraTargetSelect').value;
    const avoidHazards = document.getElementById('dsaAvoidHazardsToggle').checked;

    if (source === target) {
      alert("Source and target nodes must be different.");
      return;
    }

    const result = window.rescueRoadNetwork.dijkstra(source, target, avoidHazards);

    const resultBox = document.getElementById('dsaDijkstraResultBox');
    const tableBody = document.getElementById('dsaRelaxationTableBody');

    if (!result.success) {
      resultBox.innerHTML = `
        <div class="alert alert-danger">
          <strong>Path Blocked!</strong> Dijkstra algorithm terminated because all paths between ${source} and ${target} are cut off by active hazards.
        </div>
      `;
      tableBody.innerHTML = '';
      return;
    }

    resultBox.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:var(--radius-sm); padding:14px; margin-bottom:14px;">
        <div style="font-weight:700; color:#15803d; font-size:1.05rem; margin-bottom:4px;">
          ✅ Shortest Path Found: ${result.distance} km
        </div>
        <div style="font-size:0.9rem; color:#166534;">
          Optimal Route Sequence: <strong>${result.path.join(' ➔ ')}</strong>
        </div>
      </div>
    `;

    // Render step-by-step edge relaxations
    if (result.steps && result.steps.length > 0) {
      tableBody.innerHTML = result.steps.map(step => `
        <tr>
          <td><strong>Step ${step.step}</strong></td>
          <td><code>${step.currentNode}</code></td>
          <td><code>${step.neighbor}</code></td>
          <td>${step.edgeWeight} km</td>
          <td>${step.oldDist === Infinity ? '∞' : step.oldDist + ' km'}</td>
          <td><strong style="color:var(--accent-teal);">${step.newDist} km</strong></td>
          <td><span class="badge" style="background:#dcfce7; color:#15803d;">RELAXED</span></td>
        </tr>
      `).join('');
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:16px;">Direct path extracted without intermediate relaxations.</td></tr>`;
    }
  }

  /* ================= SIMULATION CLOCK ================= */
  startSimulationClock() {
    this.simTimer = setInterval(() => {
      if (!this.simRunning) return;
      this.simSeconds += 1;

      const hrs = Math.floor(this.simSeconds / 3600) % 24;
      const mins = Math.floor((this.simSeconds % 3600) / 60);
      const secs = this.simSeconds % 60;

      const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} IST`;
      const clockEl = document.getElementById('simClockDisplay');
      if (clockEl) clockEl.textContent = timeStr;
    }, 1000);
  }

  /* ================= NOTIFICATION TOASTS ================= */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'emergency') icon = '🚨';
    else if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span>${icon}</span>
      <span style="flex:1;">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Bootstrap application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.rescueApp = new RescueApp();
  window.rescueApp.init();
});