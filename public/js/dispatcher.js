/**
 * RescueRoute — Intelligent Automated Resource Dispatcher
 * Incorporates:
 * 1. Priority Queue: Triage critical emergencies first
 * 2. Dijkstra's Algorithm + Binary Min-Heap: Matches nearest available responder along shortest path
 * 3. Automatic Assignment: Assigns best units and updates fleet availability
 */

class RescueDispatcher {
  constructor() {}

  /**
   * Get all pending incidents strictly ordered by Priority Queue (Critical first)
   */
  getPrioritizedPendingIncidents() {
    const incidents = window.rescueStore.getIncidents();
    const pending = incidents.filter(i => i.status === "PENDING");
    window.rescuePriorityQueue.rebuild(pending);
    return window.rescuePriorityQueue.toArray();
  }

  /**
   * Find and rank responders for an incident using Dijkstra's shortest path
   */
  getRecommendationsForIncident(incidentId) {
    const incidents = window.rescueStore.getIncidents();
    const units = window.rescueStore.getUnits();
    const targetInc = incidents.find(i => i.id === incidentId);

    if (!targetInc) return [];

    const availableUnits = units.filter(u => u.status === "AVAILABLE" || u.availability === "AVAILABLE");
    if (availableUnits.length === 0) return [];

    const incidentNodeId = targetInc.nodeId || window.rescueRoadNetwork.findNearestNode(targetInc.lat, targetInc.lng)?.id || "LOC_CENTRAL";

    const scoredList = availableUnits.map(unit => {
      // Find responder's node
      const responderNodeId = unit.nodeId || window.rescueRoadNetwork.findNearestNode(unit.lat, unit.lng)?.id || "LOC_CENTRAL";
      
      // Execute Dijkstra with Binary Min-Heap
      const dijkstraRes = window.rescueRoadNetwork.dijkstra(responderNodeId, incidentNodeId, true);
      const shortestDistKm = dijkstraRes.success ? dijkstraRes.distance : window.rescueRouting.calculateDistanceKm(unit.lat, unit.lng, targetInc.lat, targetInc.lng);

      // Score unit
      let score = 50;
      const typeMatch = targetInc.requiredUnits && targetInc.requiredUnits.includes(unit.type);
      if (typeMatch) score += 30;

      // Proximity bonus using Dijkstra's road distance
      if (shortestDistKm < 3.5) score += 20;
      else if (shortestDistKm < 6.0) score += 10;
      else if (shortestDistKm > 10.0) score -= 15;

      if (unit.fuelPct > 80) score += 5;
      if (unit.capacityVictims >= targetInc.victims) score += 5;

      const estMinutes = Math.max(3, Math.round((shortestDistKm / (unit.speedKmH || 45)) * 60));

      return {
        unit,
        score: Math.max(10, Math.min(100, Math.round(score))),
        distanceKm: Number(shortestDistKm.toFixed(1)),
        estMinutes,
        dijkstraRes
      };
    });

    return scoredList.sort((a, b) => b.score - a.score);
  }

  /**
   * Execute dispatch of a responder to an incident
   */
  dispatchUnit(unitId, incidentId, safetyMode = "SAFE", missionNote = "") {
    const units = window.rescueStore.getUnits();
    const incidents = window.rescueStore.getIncidents();
    const hazards = window.rescueStore.getHazards();

    const unit = units.find(u => u.id === unitId);
    const incident = incidents.find(i => i.id === incidentId);

    if (!unit || !incident) {
      return { success: false, message: "Responder or Incident not found" };
    }

    // Resolve nodes for Dijkstra route
    const responderNodeId = unit.nodeId || window.rescueRoadNetwork.findNearestNode(unit.lat, unit.lng)?.id || "LOC_CENTRAL";
    const incidentNodeId = incident.nodeId || window.rescueRoadNetwork.findNearestNode(incident.lat, incident.lng)?.id || "LOC_CENTRAL";

    // Run Dijkstra's algorithm
    const dijkstraResult = window.rescueRoadNetwork.dijkstra(responderNodeId, incidentNodeId, safetyMode === "SAFE");

    // Compute route telemetry
    const route = window.rescueRouting.computeOptimalRoute(
      { lat: unit.lat, lng: unit.lng },
      { lat: incident.lat, lng: incident.lng },
      hazards,
      unit.type,
      safetyMode
    );

    // Update responder status & assignments
    unit.status = "EN_ROUTE";
    unit.availability = "EN_ROUTE";
    unit.assignedIncident = incident.id;
    unit.targetIncidentId = incident.id;
    unit.currentEta = route.etaMinutes || Math.max(3, Math.round((dijkstraResult.distance / 45) * 60));
    unit.routeStrategy = safetyMode;
    unit.lastDijkstraPath = dijkstraResult.path;
    unit.lastDijkstraDistance = dijkstraResult.distance;

    // Update incident status
    incident.status = "DISPATCHED";
    incident.assignedUnitId = unit.id;
    incident.assignedResponderName = unit.name;

    window.rescueStore.saveUnits(units);
    window.rescueStore.saveIncidents(incidents);

    // Log in audit trail
    window.rescueStore.logAction(
      "DISPATCH_AUTHORIZED",
      `${unit.name} ➡️ ${incident.id}`,
      `Dispatched via Dijkstra Shortest Safe Route (${dijkstraResult.distance} km across ${dijkstraResult.path.length} waypoints). ETA: ${unit.currentEta} mins.`,
      "Dijkstra AI Dispatcher"
    );

    // Play dispatch sound
    window.rescueAudio.playDispatchChirp();

    return {
      success: true,
      unit,
      incident,
      route,
      dijkstraResult
    };
  }

  /**
   * Automatic assignment of the nearest available responder to the top priority incident
   */
  assignNearestToTopIncident() {
    const prioritizedPending = this.getPrioritizedPendingIncidents();
    if (prioritizedPending.length === 0) {
      return { success: false, message: "No pending incidents in Priority Queue." };
    }

    const topIncident = prioritizedPending[0];
    const units = window.rescueStore.getUnits();
    const targetNodeId = topIncident.nodeId || window.rescueRoadNetwork.findNearestNode(topIncident.lat, topIncident.lng)?.id || "LOC_CENTRAL";

    // Use Dijkstra's algorithm to find nearest available responder
    const nearestSearch = window.rescueRoadNetwork.findNearestAvailableResponder(targetNodeId, units, true);
    if (!nearestSearch.found) {
      return { success: false, message: nearestSearch.message };
    }

    const result = this.dispatchUnit(
      nearestSearch.responder.id,
      topIncident.id,
      "SAFE",
      `Dijkstra Nearest Responder Match (${nearestSearch.distanceKm} km shortest path)`
    );

    return {
      success: true,
      incident: topIncident,
      responder: nearestSearch.responder,
      distanceKm: nearestSearch.distanceKm,
      dijkstraResult: nearestSearch.dijkstraResult
    };
  }

  /**
   * Auto-dispatch all pending incidents in priority queue order
   */
  autoDispatchAllPending() {
    const prioritizedPending = this.getPrioritizedPendingIncidents();
    if (prioritizedPending.length === 0) {
      return { count: 0, message: "No pending SOS incidents requiring dispatch." };
    }

    let dispatchedCount = 0;
    const dispatchDetails = [];

    // Process incidents in Priority Queue order (Critical first!)
    prioritizedPending.forEach(inc => {
      const units = window.rescueStore.getUnits();
      const targetNodeId = inc.nodeId || window.rescueRoadNetwork.findNearestNode(inc.lat, inc.lng)?.id || "LOC_CENTRAL";
      const nearestSearch = window.rescueRoadNetwork.findNearestAvailableResponder(targetNodeId, units, true);

      if (nearestSearch.found) {
        const res = this.dispatchUnit(
          nearestSearch.responder.id,
          inc.id,
          "SAFE",
          `Auto Priority Queue Triage Dispatch (${nearestSearch.distanceKm} km via Dijkstra)`
        );
        if (res.success) {
          dispatchedCount++;
          dispatchDetails.push(`${nearestSearch.responder.name} ➡️ ${inc.title} [${nearestSearch.distanceKm} km]`);
        }
      }
    });

    return {
      count: dispatchedCount,
      details: dispatchDetails
    };
  }

  /**
   * Transfer evacuated citizens to a designated shelter
   */
  transferToShelter(incidentId, shelterId, count) {
    const shelters = window.rescueStore.getShelters();
    const incidents = window.rescueStore.getIncidents();

    const shelter = shelters.find(s => s.id === shelterId);
    const incident = incidents.find(i => i.id === incidentId);

    if (!shelter) return { success: false, message: "Shelter not found." };
    const num = parseInt(count, 10) || 0;

    if (shelter.currentOccupancy + num > shelter.capacity) {
      return {
        success: false,
        message: `Shelter capacity exceeded! Space remaining: ${shelter.capacity - shelter.currentOccupancy}`
      };
    }

    shelter.currentOccupancy += num;
    window.rescueStore.saveShelters(shelters);

    if (incident) {
      incident.victimsRescued = (incident.victimsRescued || 0) + num;
      if (incident.victimsRescued >= incident.victims) {
        window.rescueStore.resolveIncident(incident.id);
      } else {
        window.rescueStore.saveIncidents(incidents);
      }
    }

    window.rescueStore.logAction(
      "EVACUEES_ACCOMMODATED",
      `${shelter.name}`,
      `Accommodated ${num} evacuees from ${incident ? incident.id : 'Sector Relief'}. Current occupancy: ${shelter.currentOccupancy}/${shelter.capacity}.`,
      "Shelter Officer"
    );

    return { success: true, shelter };
  }
}

window.rescueDispatcher = new RescueDispatcher();
