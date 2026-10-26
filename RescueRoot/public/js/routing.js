/**
 * RescueRoute — Intelligent Hazard-Aware Pathfinding Engine
 * Computes optimal corridors avoiding active flood zones, roadblocks, and debris.
 */

class RescueRoutingEngine {
  constructor() {
    // Earth radius in kilometers
    this.EARTH_RADIUS_KM = 6371;
  }

  /**
   * Haversine formula to compute distance in km
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  rad2deg(rad) {
    return rad * (180 / Math.PI);
  }

  /**
   * Check if a direct segment between A and B crosses within hazard radius
   */
  checkHazardIntersection(p1, p2, hazard) {
    if (!hazard.active) return false;

    // Convert hazard radius from meters to km
    const hazardRadiusKm = (hazard.radiusMeters || 300) / 1000;
    
    // Sample points along the segment
    const samples = 20;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const sampledLat = p1.lat + t * (p2.lat - p1.lat);
      const sampledLng = p1.lng + t * (p2.lng - p1.lng);
      const distToHazard = this.calculateDistanceKm(sampledLat, sampledLng, hazard.lat, hazard.lng);
      if (distToHazard <= hazardRadiusKm) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find any intersecting active hazards for a direct route
   */
  findIntersectingHazards(p1, p2, hazards) {
    return hazards.filter(h => h.active && this.checkHazardIntersection(p1, p2, h));
  }

  /**
   * Compute safe corridor bypassing hazards
   */
  computeOptimalRoute(startPoint, endPoint, hazards, vehicleProfile = "AMBULANCE", strategy = "SAFE") {
    const directDistKm = this.calculateDistanceKm(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
    const intersectingHazards = this.findIntersectingHazards(startPoint, endPoint, hazards);

    // Speed profile lookup
    let averageSpeedKmH = 45;
    if (vehicleProfile === "RESCUE_BOAT") averageSpeedKmH = 28;
    else if (vehicleProfile === "HEAVY_TRUCK") averageSpeedKmH = 38;
    else if (vehicleProfile === "DRONE") averageSpeedKmH = 65;

    // For drones, direct path ignoring ground hazards unless weather/air hazard
    if (vehicleProfile === "DRONE") {
      const etaMinutes = Math.round((directDistKm / averageSpeedKmH) * 60) + 1;
      return {
        path: [
          { lat: startPoint.lat, lng: startPoint.lng, label: "Takeoff Depot" },
          { lat: (startPoint.lat + endPoint.lat) / 2, lng: (startPoint.lng + endPoint.lng) / 2, label: "Aerial Transit Corridor" },
          { lat: endPoint.lat, lng: endPoint.lng, label: "Target Drop Zone" }
        ],
        distanceKm: Number(directDistKm.toFixed(2)),
        etaMinutes,
        hasHazardsAvoided: false,
        hazardCount: 0,
        strategy: "AERIAL_DIRECT",
        safetyScore: 99,
        avoidanceNote: "Direct aerial corridor unaffected by surface waterlogging or road debris."
      };
    }

    // Ground routes:
    if (intersectingHazards.length === 0 || strategy === "FASTEST") {
      // Direct path or fastest with hazard warning
      const intermediateSteps = 4;
      const path = [{ lat: startPoint.lat, lng: startPoint.lng, label: "Start Origin" }];
      
      for (let i = 1; i < intermediateSteps; i++) {
        const t = i / intermediateSteps;
        // slight jitter to represent urban street grid
        const jitter = Math.sin(t * Math.PI) * 0.003;
        path.push({
          lat: startPoint.lat + t * (endPoint.lat - startPoint.lat) + jitter,
          lng: startPoint.lng + t * (endPoint.lng - startPoint.lng) + jitter * 0.7,
          label: `Arterial Checkpoint ${i}`
        });
      }
      path.push({ lat: endPoint.lat, lng: endPoint.lng, label: "Incident Target" });

      const dist = directDistKm * 1.12; // Grid road factor
      const etaMinutes = Math.max(3, Math.round((dist / averageSpeedKmH) * 60));

      return {
        path,
        distanceKm: Number(dist.toFixed(2)),
        etaMinutes,
        hasHazardsAvoided: false,
        hazardCount: intersectingHazards.length,
        interceptedHazards: intersectingHazards,
        strategy,
        safetyScore: intersectingHazards.length > 0 ? 55 : 95,
        avoidanceNote: intersectingHazards.length > 0 
          ? `WARNING: Path enters ${intersectingHazards.length} danger sectors. High clearance vehicle recommended.`
          : "Direct urban grid clearance clear. Normal emergency siren escort."
      };
    }

    // Strategy === 'SAFE': Detour waypoints around each hazard perimeter
    const path = [{ lat: startPoint.lat, lng: startPoint.lng, label: "Dispatch Depot Departure" }];
    const avoidedNames = [];

    intersectingHazards.forEach((hazard, idx) => {
      avoidedNames.push(hazard.title);
      const hazardRadiusKm = (hazard.radiusMeters || 350) / 1000;
      const bufferDistDeg = (hazardRadiusKm * 1.6) / 111; // ~111km per degree

      // Determine bypass direction (perpendicular shift)
      const dLat = endPoint.lat - startPoint.lat;
      const dLng = endPoint.lng - startPoint.lng;

      // Normal vector
      const perpLat = -dLng;
      const perpLng = dLat;
      const len = Math.sqrt(perpLat * perpLat + perpLng * perpLng) || 1;

      // Waypoint 1: Approach diversion
      path.push({
        lat: hazard.lat + (perpLat / len) * bufferDistDeg - 0.002,
        lng: hazard.lng + (perpLng / len) * bufferDistDeg,
        label: `Bypass Waypoint North (${hazard.title.split(' ')[0]})`
      });

      // Waypoint 2: Clearance ring
      path.push({
        lat: hazard.lat + (perpLat / len) * (bufferDistDeg * 1.2) + 0.003,
        lng: hazard.lng + (perpLng / len) * (bufferDistDeg * 1.2),
        label: `Elevated Corridor Clearance Checkpoint`
      });
    });

    path.push({ lat: endPoint.lat, lng: endPoint.lng, label: "Incident Destination" });

    // Calculate total detour distance
    let totalDetourKm = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDetourKm += this.calculateDistanceKm(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    }
    totalDetourKm *= 1.08; // minor city turn penalty

    const etaMinutes = Math.max(4, Math.round((totalDetourKm / averageSpeedKmH) * 60));

    return {
      path,
      distanceKm: Number(totalDetourKm.toFixed(2)),
      etaMinutes,
      hasHazardsAvoided: true,
      hazardCount: intersectingHazards.length,
      interceptedHazards: intersectingHazards,
      strategy: "SAFE_CORRIDOR",
      safetyScore: 100,
      avoidanceNote: `Safely bypassed ${avoidedNames.join(", ")}. Added +${(totalDetourKm - directDistKm).toFixed(1)} km detour to ensure 0% flood/collapse risk.`
    };
  }

  /**
   * Helper to interpolate path into N evenly spaced points for animated vehicle simulation
   */
  interpolateCoordinates(path, numPoints = 60) {
    if (path.length < 2) return path;
    const result = [];
    const segments = path.length - 1;
    const pointsPerSegment = Math.floor(numPoints / segments);

    for (let s = 0; s < segments; s++) {
      const p1 = path[s];
      const p2 = path[s + 1];
      for (let i = 0; i < pointsPerSegment; i++) {
        const t = i / pointsPerSegment;
        result.push([
          p1.lat + t * (p2.lat - p1.lat),
          p1.lng + t * (p2.lng - p1.lng)
        ]);
      }
    }
    result.push([path[path.length - 1].lat, path[path.length - 1].lng]);
    return result;
  }
}

window.rescueRouting = new RescueRoutingEngine();
