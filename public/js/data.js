/**
 * RescueRoute — Intelligent Emergency Resource and Rescue Coordinator
 * Initial Data Model & LocalStorage Persistence Engine
 */

const DEFAULT_COORDINATES = {
  lat: 13.0450,
  lng: 80.2300,
  zoom: 12
};

const INITIAL_INCIDENTS = [
  {
    id: "INC-101",
    title: "Severe Residential Flash Flood",
    type: "FLOOD",
    severity: "CRITICAL",
    callerName: "S. Swaminathan (Resident Welfare)",
    callerPhone: "+91 94440 12890",
    locationName: "Lake View Road, Velachery Sector",
    nodeId: "LOC_VELACHERY",
    sector: "Coastal Basin",
    lat: 12.9815,
    lng: 80.2180,
    victims: 8,
    victimsRescued: 0,
    requiredUnits: ["RESCUE_BOAT", "AMBULANCE"],
    description: "Water level rose to 4.5 feet within 40 minutes. 3 elderly citizens and 2 infants trapped on ground floor balcony. Inflow from overflowing lake canal.",
    status: "PENDING", // PENDING, DISPATCHED, ON_SCENE, RESOLVED
    assignedUnitId: null,
    reportedTime: "06:45 AM",
    priorityScore: 98
  },
  {
    id: "INC-102",
    title: "Commercial Complex Structural Fire",
    type: "FIRE",
    severity: "CRITICAL",
    callerName: "Priya Rajan (Security Chief)",
    callerPhone: "+91 98841 55670",
    locationName: "Anna Salai Metro Crossway, Sector 2",
    nodeId: "LOC_APOLLO",
    sector: "Metro Center",
    lat: 13.0600,
    lng: 80.2490,
    victims: 14,
    victimsRescued: 4,
    requiredUnits: ["HEAVY_TRUCK", "AMBULANCE"],
    description: "Electrical substation flare ignited second-floor commercial office. Heavy toxic smoke spreading into stairwells. Exit staircase partially obstructed.",
    status: "DISPATCHED",
    assignedUnitId: "UNIT-TRUCK-01",
    reportedTime: "07:10 AM",
    priorityScore: 94
  },
  {
    id: "INC-103",
    title: "Old Community Hall Partial Roof Collapse",
    type: "COLLAPSE",
    severity: "HIGH",
    callerName: "K. Mohan (Ward Volunteer)",
    callerPhone: "+91 97910 44211",
    locationName: "Railway Feeder Lane, Perambur Hub",
    nodeId: "LOC_PERAMBUR",
    sector: "Industrial Hub",
    lat: 13.1110,
    lng: 80.2330,
    victims: 5,
    victimsRescued: 0,
    requiredUnits: ["HEAVY_TRUCK", "AMBULANCE"],
    description: "Heavy rain weakened structural masonry. Concrete awning fell on waiting shelter. 2 trapped under light slab, conscious.",
    status: "PENDING",
    assignedUnitId: null,
    reportedTime: "07:18 AM",
    priorityScore: 86
  },
  {
    id: "INC-104",
    title: "Urgent Hospital Oxygen Cylinder Stockout",
    type: "MEDICAL",
    severity: "CRITICAL",
    callerName: "Dr. A. Meenakshi (ICU Incharge)",
    callerPhone: "+91 91760 99321",
    locationName: "CSI Hospital Annex, Triplicane",
    nodeId: "LOC_MARINA",
    sector: "Coastal Basin",
    lat: 13.0550,
    lng: 80.2740,
    victims: 12,
    victimsRescued: 0,
    requiredUnits: ["DRONE", "AMBULANCE"],
    description: "Road access cut off due to water inundation. Emergency ventilator backup running on final 40 minutes reserves. Need rapid cylinder delivery.",
    status: "PENDING",
    assignedUnitId: null,
    reportedTime: "07:22 AM",
    priorityScore: 96
  },
  {
    id: "INC-105",
    title: "Uprooted Banyan Tree Blocking Medical Corridor",
    type: "CYCLONE",
    severity: "MODERATE",
    callerName: "Traffic Sub-Inspector Kannan",
    callerPhone: "+91 94450 88200",
    locationName: "Kotturpuram River Crossing Approach",
    nodeId: "LOC_ADYAR",
    sector: "River Bridge",
    lat: 13.0180,
    lng: 80.2370,
    victims: 0,
    victimsRescued: 0,
    requiredUnits: ["HEAVY_TRUCK"],
    description: "Century-old banyan tree fell across 4-lane arterial road. Snapped secondary electric power lines. Blocking direct route to Government General Hospital.",
    status: "ON_SCENE",
    assignedUnitId: "UNIT-TRUCK-02",
    reportedTime: "06:15 AM",
    priorityScore: 72
  },
  {
    id: "INC-106",
    title: "Slum Settlement Rising Backwater Inundation",
    type: "FLOOD",
    severity: "HIGH",
    callerName: "V. Selvam (Community Leader)",
    callerPhone: "+91 98400 33112",
    locationName: "Saidapet Canal Banks, Sector 3",
    nodeId: "LOC_SAIDAPET",
    sector: "River Bridge",
    lat: 13.0230,
    lng: 80.2190,
    victims: 22,
    victimsRescued: 10,
    requiredUnits: ["RESCUE_BOAT"],
    description: "Canal overflowed banks after sluice gates opened. 8 households submerged up to 3 feet. Evacuation to higher primary school needed.",
    status: "DISPATCHED",
    assignedUnitId: "UNIT-BOAT-01",
    reportedTime: "06:55 AM",
    priorityScore: 89
  },
  {
    id: "INC-100",
    title: "Senior Living Center Inundation Clearance",
    type: "FLOOD",
    severity: "MODERATE",
    callerName: "K. Rangarajan (Warden)",
    callerPhone: "+91 94441 55210",
    locationName: "Adyar Old Trunk Road",
    nodeId: "LOC_ADYAR",
    sector: "River Bridge",
    lat: 13.0060,
    lng: 80.2570,
    victims: 6,
    victimsRescued: 6,
    requiredUnits: ["AMBULANCE"],
    description: "Ground floor water cleared by municipal drainage pumps. All 6 senior citizens safely moved to upper floor sanctuary and stabilized.",
    status: "RESOLVED",
    assignedUnitId: null,
    reportedTime: "05:30 AM",
    priorityScore: 65
  }
];

const INITIAL_RESCUE_UNITS = [
  {
    id: "UNIT-AMB-01",
    name: "Rescue Amb Alpha (ALS-1)",
    type: "AMBULANCE",
    status: "AVAILABLE", // AVAILABLE, EN_ROUTE, ON_SCENE, MAINTENANCE
    availability: "AVAILABLE",
    location: "Apollo Medical Depot (Greams Rd)",
    locationName: "Apollo Medical Depot, Greams Road",
    nodeId: "LOC_APOLLO",
    assignedIncident: null,
    targetIncidentId: null,
    speedKmH: 50,
    capacityVictims: 3,
    fuelPct: 92,
    lat: 13.0610,
    lng: 80.2520,
    crewLead: "Paramedic S. Rajesh",
    equipment: ["Ventilator", "Defibrillator", "Oxygen Kits (x4)", "Spine Board"]
  },
  {
    id: "UNIT-AMB-02",
    name: "Rescue Amb Bravo (ALS-2)",
    type: "AMBULANCE",
    status: "AVAILABLE",
    availability: "AVAILABLE",
    location: "Guindy Disaster Base Camp",
    locationName: "Guindy Disaster Base Camp",
    nodeId: "LOC_GUINDY",
    assignedIncident: null,
    targetIncidentId: null,
    speedKmH: 48,
    capacityVictims: 4,
    fuelPct: 84,
    lat: 13.0070,
    lng: 80.2080,
    crewLead: "Paramedic V. Fatima",
    equipment: ["ECG Monitor", "Trauma Kits", "Portable Suction", "Oxygen"]
  },
  {
    id: "UNIT-BOAT-01",
    name: "NDRF Inflatable Boat Echo",
    type: "RESCUE_BOAT",
    status: "EN_ROUTE",
    availability: "EN_ROUTE",
    location: "Saidapet Causeway",
    locationName: "Saidapet River Station",
    nodeId: "LOC_SAIDAPET",
    assignedIncident: "INC-106",
    targetIncidentId: "INC-106",
    speedKmH: 30,
    capacityVictims: 10,
    fuelPct: 78,
    lat: 13.0250,
    lng: 80.2220,
    crewLead: "Sub-Inspector Vikram Singh",
    equipment: ["Outboard Motor", "15 Lifejackets", "Throw Lines", "First Aid Rations"]
  },
  {
    id: "UNIT-BOAT-02",
    name: "State Disaster Boat Delta",
    type: "RESCUE_BOAT",
    status: "AVAILABLE",
    availability: "AVAILABLE",
    location: "Marina Coastal Pier Station",
    locationName: "Marina Coastal Pier Station",
    nodeId: "LOC_MARINA",
    assignedIncident: null,
    targetIncidentId: null,
    speedKmH: 32,
    capacityVictims: 12,
    fuelPct: 95,
    lat: 13.0480,
    lng: 80.2800,
    crewLead: "Inspector T. Natarajan",
    equipment: ["Fiberglass Hull", "Night Searchlight", "Echo Depth Sounder", "Rope Ladders"]
  },
  {
    id: "UNIT-TRUCK-01",
    name: "Tactical Fire Engine Heavy-1",
    type: "HEAVY_TRUCK",
    status: "EN_ROUTE",
    availability: "EN_ROUTE",
    location: "Central Fire HQ, Egmore",
    locationName: "Central Fire HQ, Egmore",
    nodeId: "LOC_CENTRAL",
    assignedIncident: "INC-102",
    targetIncidentId: "INC-102",
    speedKmH: 40,
    capacityVictims: 2,
    fuelPct: 70,
    lat: 13.0800,
    lng: 80.2600,
    crewLead: "Chief Fire Officer M. Joseph",
    equipment: ["6000L Water Cannon", "Hydraulic Rescue Jaws", "Smoke Ventilators", "Foam Compound"]
  },
  {
    id: "UNIT-TRUCK-02",
    name: "Quick Response Disaster Tender-2",
    type: "HEAVY_TRUCK",
    status: "ON_SCENE",
    availability: "ON_SCENE",
    location: "Kotturpuram Bridge",
    locationName: "Kotturpuram Bridge",
    nodeId: "LOC_ADYAR",
    assignedIncident: "INC-105",
    targetIncidentId: "INC-105",
    speedKmH: 45,
    capacityVictims: 2,
    fuelPct: 88,
    lat: 13.0180,
    lng: 80.2370,
    crewLead: "Station Officer D. Kumar",
    equipment: ["Heavy Winch", "Tree Chainsaws", "Floodlights Generator", "Cutting Torches"]
  },
  {
    id: "UNIT-DRONE-01",
    name: "AeroRescue Hexacopter Drone-1",
    type: "DRONE",
    status: "AVAILABLE",
    availability: "AVAILABLE",
    location: "Mylapore Relief Depot",
    locationName: "Mylapore Relief Depot",
    nodeId: "LOC_MYLAPORE",
    assignedIncident: null,
    targetIncidentId: null,
    speedKmH: 65,
    capacityVictims: 0,
    fuelPct: 100,
    lat: 13.0330,
    lng: 80.2670,
    crewLead: "Drone Pilot Ananya Sen",
    equipment: ["Thermal FLIR Camera", "5kg Medicine Drop Pod", "PA Speaker Horn", "Spotlight"]
  },
  {
    id: "UNIT-AMB-03",
    name: "Rescue Amb Gamma (ALS-3)",
    type: "AMBULANCE",
    status: "AVAILABLE",
    availability: "AVAILABLE",
    location: "Perambur North Station",
    locationName: "Perambur North Station",
    nodeId: "LOC_PERAMBUR",
    assignedIncident: null,
    targetIncidentId: null,
    speedKmH: 48,
    capacityVictims: 3,
    fuelPct: 90,
    lat: 13.1110,
    lng: 80.2330,
    crewLead: "Paramedic R. Vignesh",
    equipment: ["Portable Oxygen", "Cardiac Defib", "Trauma Splints"]
  }
];

const INITIAL_SHELTERS = [
  {
    id: "SHELTER-01",
    name: "Perunthalaivar Kamarajar Relief Camp",
    locationName: "Higher Secondary Campus, Guindy",
    nodeId: "LOC_GUINDY",
    lat: 13.0110,
    lng: 80.2140,
    capacity: 400,
    currentOccupancy: 260,
    foodDaysLeft: 6,
    hasMedicalTeam: true,
    hasCleanWater: true,
    hasGeneratorBackup: true,
    supervisor: "Officer K. Sundaram (+91 94441 22910)",
    amenities: ["Emergency Clinic", "Infant Feeding Zone", "Separate Women Dorm", "Community Kitchen"]
  },
  {
    id: "SHELTER-02",
    name: "Nehru Indoor Stadium Safe Complex",
    locationName: "Sydenhams Road, Periamet",
    nodeId: "LOC_CENTRAL",
    lat: 13.0850,
    lng: 80.2720,
    capacity: 600,
    currentOccupancy: 320,
    foodDaysLeft: 8,
    hasMedicalTeam: true,
    hasCleanWater: true,
    hasGeneratorBackup: true,
    supervisor: "Officer S. Jayanthi (+91 98840 88712)",
    amenities: ["Full ICU Ward", "Helipad Access", "Clean Water Filtration", "Ample Stretcher Access"]
  },
  {
    id: "SHELTER-03",
    name: "St. Thomas Mount Community Center",
    locationName: "Mount Road Junction Safe Zone",
    nodeId: "LOC_SAIDAPET",
    lat: 13.0030,
    lng: 80.1980,
    capacity: 250,
    currentOccupancy: 110,
    foodDaysLeft: 4,
    hasMedicalTeam: false,
    hasCleanWater: true,
    hasGeneratorBackup: true,
    supervisor: "Volunteer Head G. Anand (+91 97900 11442)",
    amenities: ["Dry Food Packs", "Warm Blankets", "Basic First Aid", "Sanitation Blocks"]
  }
];

const INITIAL_HAZARDS = [
  {
    id: "HAZ-01",
    title: "Velachery Main Underpass Inundation",
    type: "FLOOD_ROADBLOCK",
    nodeA: "LOC_VELACHERY",
    nodeB: "LOC_GUINDY",
    severity: "BLOCKED",
    lat: 12.9920,
    lng: 80.2190,
    radiusMeters: 450,
    waterDepthMeters: 1.4,
    active: true,
    warning: "Vehicle engine stall hazard. No vehicular passage allowed except amphibious boats."
  },
  {
    id: "HAZ-02",
    title: "Maraimalai Adigalar Bridge Structural Distress",
    type: "BRIDGE_CLOSED",
    nodeA: "LOC_SAIDAPET",
    nodeB: "LOC_ADYAR",
    severity: "HIGH_RISK",
    lat: 13.0200,
    lng: 80.2280,
    radiusMeters: 380,
    waterDepthMeters: 0.8,
    active: true,
    warning: "Cracks observed on pier 4 under river scour. Heavy emergency vehicles strictly rerouted via Ring Road."
  },
  {
    id: "HAZ-03",
    title: "Downed High-Voltage Electric Cables",
    type: "ELECTRICAL",
    nodeA: "LOC_APOLLO",
    nodeB: "LOC_KODAMBAKKAM",
    severity: "EXTREME",
    lat: 13.0520,
    lng: 80.2450,
    radiusMeters: 280,
    waterDepthMeters: 0.2,
    active: true,
    warning: "11kV feeder line snapped in water pool. Electrocution risk until grid isolate verified."
  }
];

const INITIAL_SUPPLIES = [
  { id: "SUP-01", name: "High-Flow Oxygen Cylinders", category: "Medical", inStock: 48, maxStock: 60, unit: "Cylinders", status: "SAFE" },
  { id: "SUP-02", name: "Trauma & IV Fluid Packs", category: "Medical", inStock: 320, maxStock: 400, unit: "Units", status: "SAFE" },
  { id: "SUP-03", name: "Inflatable Lifejackets (Adult & Child)", category: "Rescue", inStock: 210, maxStock: 250, unit: "Vests", status: "SAFE" },
  { id: "SUP-04", name: "Ready-To-Eat Emergency Meal Kits", category: "Relief", inStock: 1450, maxStock: 2500, unit: "Packs", status: "WARNING" },
  { id: "SUP-05", name: "Clean Bottled Drinking Water", category: "Relief", inStock: 2800, maxStock: 5000, unit: "Liters", status: "SAFE" },
  { id: "SUP-06", name: "Hydraulic Jaws of Life Kits", category: "Equipment", inStock: 6, maxStock: 8, unit: "Sets", status: "SAFE" }
];

const INITIAL_BULLETINS = [
  {
    id: "BUL-01",
    timestamp: "07:15 AM",
    category: "FLASH_FLOOD",
    headline: "URGENT FLASH FLOOD ADVISORY: EVACUATE LOW GROUND IN VELACHERY",
    body: "Water discharge from upstream lakes expected to crest by 09:30 AM. Citizens in low-lying ground floor residences are urged to move to designated Kamarajar Relief Shelter immediately. Emergency boats deployed on canal access.",
    zones: ["Sector 1: Coastal Basin", "Sector 3: River Bridge"]
  },
  {
    id: "BUL-02",
    timestamp: "06:30 AM",
    category: "CYCLONE_WARNING",
    headline: "GALE FORCE WINDS (75-85 KM/H) & TREE DAMAGE WARNING",
    body: "Public advised to avoid coastal arterial roads and bridges. Emergency crews active clearing debris near Kotturpuram corridor.",
    zones: ["All Sectors"]
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: "LOG-01",
    timestamp: "06:45:12 AM",
    action: "INCIDENT_CREATED",
    entity: "INC-101 (Velachery Flood)",
    details: "SOS intake logged. 8 victims flagged at risk. Priority scored at 98/100.",
    operator: "AI Dispatcher"
  },
  {
    id: "LOG-02",
    timestamp: "06:56:40 AM",
    action: "DISPATCH_AUTHORIZED",
    entity: "UNIT-BOAT-01 -> INC-106",
    details: "NDRF Boat Echo dispatched to Saidapet Canal. Safe corridor via River Bank bypass selected.",
    operator: "Command Duty Officer"
  },
  {
    id: "LOG-03",
    timestamp: "07:10:05 AM",
    action: "HAZARD_FLAGGED",
    entity: "HAZ-02 (Adigalar Bridge)",
    details: "Structural alert declared. Automated geofence boundary broadcasted to all active fleet navigation.",
    operator: "RescueRoute AI Guard"
  }
];

/**
 * Storage Controller managing LocalStorage with auto-recovery
 */
class RescueStore {
  constructor() {
    this.STORAGE_KEYS = {
      INCIDENTS: "rescueroute_incidents_v2",
      UNITS: "rescueroute_units_v2",
      SHELTERS: "rescueroute_shelters_v2",
      HAZARDS: "rescueroute_hazards_v2",
      SUPPLIES: "rescueroute_supplies_v2",
      BULLETINS: "rescueroute_bulletins_v2",
      AUDIT_LOGS: "rescueroute_audit_v2"
    };

    this.initStore();
  }

  initStore() {
    if (!localStorage.getItem(this.STORAGE_KEYS.INCIDENTS)) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    localStorage.setItem(this.STORAGE_KEYS.INCIDENTS, JSON.stringify(INITIAL_INCIDENTS));
    localStorage.setItem(this.STORAGE_KEYS.UNITS, JSON.stringify(INITIAL_RESCUE_UNITS));
    localStorage.setItem(this.STORAGE_KEYS.SHELTERS, JSON.stringify(INITIAL_SHELTERS));
    localStorage.setItem(this.STORAGE_KEYS.HAZARDS, JSON.stringify(INITIAL_HAZARDS));
    localStorage.setItem(this.STORAGE_KEYS.SUPPLIES, JSON.stringify(INITIAL_SUPPLIES));
    localStorage.setItem(this.STORAGE_KEYS.BULLETINS, JSON.stringify(INITIAL_BULLETINS));
    localStorage.setItem(this.STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  }

  getIncidents() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.INCIDENTS) || "[]");
  }

  saveIncidents(data) {
    localStorage.setItem(this.STORAGE_KEYS.INCIDENTS, JSON.stringify(data));
  }

  getUnits() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.UNITS) || "[]");
  }

  saveUnits(data) {
    localStorage.setItem(this.STORAGE_KEYS.UNITS, JSON.stringify(data));
  }

  getShelters() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SHELTERS) || "[]");
  }

  saveShelters(data) {
    localStorage.setItem(this.STORAGE_KEYS.SHELTERS, JSON.stringify(data));
  }

  getHazards() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.HAZARDS) || "[]");
  }

  saveHazards(data) {
    localStorage.setItem(this.STORAGE_KEYS.HAZARDS, JSON.stringify(data));
  }

  getSupplies() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUPPLIES) || "[]");
  }

  saveSupplies(data) {
    localStorage.setItem(this.STORAGE_KEYS.SUPPLIES, JSON.stringify(data));
  }

  getBulletins() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.BULLETINS) || "[]");
  }

  saveBulletins(data) {
    localStorage.setItem(this.STORAGE_KEYS.BULLETINS, JSON.stringify(data));
  }

  getAuditLogs() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.AUDIT_LOGS) || "[]");
  }

  logAction(action, entity, details, operator = "Operator") {
    const logs = this.getAuditLogs();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: timeStr,
      action,
      entity,
      details,
      operator
    };
    logs.unshift(newEntry);
    if (logs.length > 50) logs.pop();
    localStorage.setItem(this.STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    return newEntry;
  }

  /**
   * Mark an incident as resolved and free its assigned responder
   */
  resolveIncident(incidentId) {
    const incidents = this.getIncidents();
    const units = this.getUnits();
    const inc = incidents.find(i => i.id === incidentId);

    if (!inc) return { success: false, message: "Incident not found" };

    inc.status = "RESOLVED";
    inc.victimsRescued = inc.victims;

    // Free assigned responder
    let freedUnit = null;
    if (inc.assignedUnitId) {
      freedUnit = units.find(u => u.id === inc.assignedUnitId);
      if (freedUnit) {
        freedUnit.status = "AVAILABLE";
        freedUnit.availability = "AVAILABLE";
        freedUnit.assignedIncident = null;
        freedUnit.targetIncidentId = null;
      }
    }

    // Also check if any responder had this incident assigned
    units.forEach(u => {
      if (u.assignedIncident === incidentId || u.targetIncidentId === incidentId) {
        u.status = "AVAILABLE";
        u.availability = "AVAILABLE";
        u.assignedIncident = null;
        u.targetIncidentId = null;
        freedUnit = u;
      }
    });

    this.saveIncidents(incidents);
    this.saveUnits(units);

    this.logAction(
      "INCIDENT_RESOLVED",
      inc.title,
      `Marked as RESOLVED. All ${inc.victims} victims secured. ${freedUnit ? `Responder ${freedUnit.name} is now AVAILABLE.` : ''}`,
      "Incident Commander"
    );

    return { success: true, incident: inc, freedUnit };
  }

  /**
   * Make a responder available directly
   */
  makeResponderAvailable(unitId) {
    const units = this.getUnits();
    const unit = units.find(u => u.id === unitId);
    if (!unit) return { success: false };

    unit.status = "AVAILABLE";
    unit.availability = "AVAILABLE";
    unit.assignedIncident = null;
    unit.targetIncidentId = null;
    this.saveUnits(units);

    this.logAction("RESPONDER_FREED", unit.name, "Status manually updated to AVAILABLE.", "Fleet Lead");
    return { success: true, unit };
  }
}

// Global store instance
window.rescueStore = new RescueStore();
