/**
 * ============================================================================
 * RescueRoute — Core Data Structures & Algorithms (DSA) Engine
 * ============================================================================
 * 
 * This file contains the complete algorithmic foundation for RescueRoute:
 * 
 * 1. BINARY MIN-HEAP (BinaryMinHeap)
 *    - Array-based complete binary tree data structure.
 *    - Keeps minimum-distance node at root for O(1) retrieval.
 *    - Powers Dijkstra's shortest-path calculations in O((V + E) log V).
 * 
 * 2. EMERGENCY PRIORITY QUEUE (EmergencyPriorityQueue)
 *    - Implements emergency triage logic where Level 4 (CRITICAL) incidents
 *      are processed before Level 3 (HIGH), Level 2 (MODERATE), or Level 1 (LOW).
 *    - Tie-breaking by victim count and timestamp.
 * 
 * 3. CITY ROAD NETWORK GRAPH (CityRoadNetwork)
 *    - Represents Chennai urban transit corridors as an Adjacency List.
 *    - 10 key transit nodes (hubs, hospitals, depots) connected by 13 weighted roads.
 *    - Dynamically toggles road blockage states (floods, structural cracks).
 * 
 * 4. DIJKSTRA'S SHORTEST PATH ALGORITHM
 *    - Greedy algorithm that finds the absolute shortest safe route between nodes.
 *    - Skips blocked edges when hazard avoidance is enabled.
 *    - Records step-by-step edge relaxations for DSA educational insights.
 * 
 * 5. NEAREST RESPONDER ASSIGNMENT
 *    - Computes shortest-path distances from all available units to the incident.
 *    - Dispatches the optimal responder with minimal travel delay.
 * ============================================================================
 */

/* ============================================================================
   1. BINARY MIN-HEAP
   ----------------------------------------------------------------------------
   THEORY FOR PROFESSOR / VIVA:
   - What is it? A complete binary tree where the key at root is the minimum among
     all keys present in the Binary Heap.
   - Why use an Array? A complete binary tree can be uniquely represented in a 1D
     array without pointer overhead:
       * parent(i) = Math.floor((i - 1) / 2)
       * left_child(i) = 2*i + 1
       * right_child(i) = 2*i + 2
   - Complexity:
       * insert: O(log V) — elements appended at end and bubbled up.
       * extractMin: O(log V) — root replaced with last element and bubbled down.
       * peek: O(1) — inspects index 0.
   ============================================================================ */
class BinaryMinHeap {
  constructor() {
    // Array storing heap nodes: each item is { element, priority }
    this.heap = [];
  }

  /** Return the number of elements in the heap */
  size() {
    return this.heap.length;
  }

  /** Check if the heap is empty */
  isEmpty() {
    return this.heap.length === 0;
  }

  /** Return the minimum element without removing it — O(1) time */
  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  /** Helper to compute parent index in array representation: floor((i-1)/2) */
  parentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /** Helper to compute left child index: 2*i + 1 */
  leftChildIndex(i) {
    return 2 * i + 1;
  }

  /** Helper to compute right child index: 2*i + 2 */
  rightChildIndex(i) {
    return 2 * i + 2;
  }

  /** Swap elements at two indices in the heap array */
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Insert a new element with a priority (distance) into the heap — O(log V)
   * 1. Place the element at the end of the array.
   * 2. Call bubbleUp to restore the min-heap invariant.
   */
  insert(element, priority) {
    const node = { element, priority, insertId: Date.now() + Math.random() };
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Bubble-Up (Heapify-Up):
   * Compares the current node with its parent. If current node's priority is
   * smaller than parent, swap them. Repeat until min-heap property is satisfied.
   */
  bubbleUp(index) {
    let current = index;
    while (current > 0) {
      const parent = this.parentIndex(current);
      // Min-heap condition: parent must be smaller than or equal to child
      if (this.heap[current].priority < this.heap[parent].priority) {
        this.swap(current, parent);
        current = parent; // Move up one level in the tree
      } else {
        break; // Invariant satisfied
      }
    }
  }

  /**
   * Extract and return the element with the minimum priority — O(log V)
   * 1. Save the root element (index 0).
   * 2. Move the last element to index 0.
   * 3. Call bubbleDown to restore the min-heap invariant.
   */
  extractMin() {
    if (this.isEmpty()) return null;
    if (this.size() === 1) return this.heap.pop();

    const min = this.heap[0]; // The minimum element at the root
    this.heap[0] = this.heap.pop(); // Replace root with the last element
    this.bubbleDown(0); // Restore min-heap property downwards
    return min;
  }

  /**
   * Bubble-Down (Heapify-Down):
   * Compares current node with both left and right children. Swaps with the
   * smaller of the two children if current is larger. Repeats down the tree.
   */
  bubbleDown(index) {
    let current = index;
    const length = this.heap.length;

    while (this.leftChildIndex(current) < length) {
      let smallerChild = this.leftChildIndex(current);
      const rightChild = this.rightChildIndex(current);

      // If right child exists and has smaller priority than left child, select right child
      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallerChild].priority) {
        smallerChild = rightChild;
      }

      // If current node is greater than its smallest child, swap and continue down
      if (this.heap[current].priority > this.heap[smallerChild].priority) {
        this.swap(current, smallerChild);
        current = smallerChild;
      } else {
        break; // Invariant satisfied
      }
    }
  }

  /** Return array copy for visual inspector display */
  getSnapshot() {
    return this.heap.map(node => ({
      element: node.element,
      priority: node.priority
    }));
  }
}

/* ============================================================================
   2. EMERGENCY PRIORITY QUEUE (TRIAGE QUEUE)
   ----------------------------------------------------------------------------
   THEORY FOR PROFESSOR / VIVA:
   - Why not FIFO? In emergency coordination, treating calls First-In First-Out
     would mean responding to a minor road obstruction before trapped ICU patients
     simply because the minor incident was called in first.
   - Priority Comparator Rules:
       1. Triage Severity Level (CRITICAL=4 > HIGH=3 > MODERATE=2 > LOW=1)
       2. Higher Trapped Victim Count (e.g. 14 victims > 2 victims)
       3. Earliest Incident Timestamp (FIFO tie-break)
   ============================================================================ */
class EmergencyPriorityQueue {
  constructor() {
    this.queue = [];
  }

  /** Convert string severity to numerical rank for priority comparison */
  static getSeverityWeight(severity) {
    switch (severity) {
      case "CRITICAL": return 4; // Life-threatening (cardiac arrest, building collapse, ICU oxygen loss)
      case "HIGH": return 3;     // Severe injury, rising flood level
      case "MODERATE": return 2; // Trapped but stable
      case "LOW": return 1;      // Minor property damage, advisory
      default: return 1;
    }
  }

  /**
   * Priority Comparator:
   * Returns negative if 'a' has higher priority than 'b', positive if 'b' has higher priority.
   */
  compare(a, b) {
    // 1. Primary Priority: Higher Severity Weight First
    const weightA = EmergencyPriorityQueue.getSeverityWeight(a.severity);
    const weightB = EmergencyPriorityQueue.getSeverityWeight(b.severity);
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 2. Secondary Priority: Higher Number of Victims at Risk
    const victimsA = a.victims || 0;
    const victimsB = b.victims || 0;
    if (victimsA !== victimsB) {
      return victimsB - victimsA;
    }

    // 3. Tertiary Tie-breaker: Lexicographical / Timestamp ordering
    return (a.id || "").localeCompare(b.id || "");
  }

  /** Insert an incident into the priority queue — maintains priority order */
  enqueue(incident) {
    this.queue.push(incident);
    this.queue.sort((a, b) => this.compare(a, b));
  }

  /** Remove and return the highest priority emergency call */
  dequeue() {
    return this.queue.shift() || null;
  }

  /** Inspect the highest priority emergency call without removing it — O(1) */
  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /** Number of pending emergency calls in the queue */
  size() {
    return this.queue.length;
  }

  /** Check if queue has no pending calls */
  isEmpty() {
    return this.queue.length === 0;
  }

  /** Return plain array copy of all prioritized calls */
  toArray() {
    return [...this.queue];
  }

  /** Rebuild priority queue from any list of active incidents */
  rebuild(incidentsList) {
    this.queue = [...incidentsList].filter(i => i.status === "PENDING");
    this.queue.sort((a, b) => this.compare(a, b));
  }
}

/* ============================================================================
   3. CITY ROAD NETWORK (WEIGHTED GRAPH USING ADJACENCY LIST)
   ----------------------------------------------------------------------------
   THEORY FOR PROFESSOR / VIVA:
   - What is it? A graph G = (V, E) where:
       * V = 10 strategic city hubs, transit depots, and hospital campuses.
       * E = 13 weighted bidirectional roads representing real urban corridors.
   - Why Adjacency List over Adjacency Matrix?
       * Sparse Graph: Since E << V^2, an adjacency list consumes only O(V + E)
         memory compared to O(V^2) for a matrix.
       * Rapid Neighbor Iteration: Finding neighboring roads of vertex 'u' takes
         O(deg(u)) instead of O(V).
   - Dynamic Obstruction:
       * Each road edge stores { isBlocked: boolean } to simulate flood waterlogging
         or collapsed overpasses in real time.
   ============================================================================ */
class CityRoadNetwork {
  constructor() {
    // Map of nodeId -> node metadata (id, name, sector, lat, lng, type)
    this.nodes = new Map();
    // Adjacency List: Map of nodeId -> array of edge objects [{ to, weight, roadName, isBlocked }]
    this.adjacencyList = new Map();
    this.initializeDefaultGraph();
  }

  initializeDefaultGraph() {
    // 10 Key Urban Locations (Vertices)
    const defaultNodes = [
      { id: "LOC_CENTRAL", name: "Central Railway & Metro Hub", sector: "Metro Center", lat: 13.0827, lng: 80.2707, type: "HUB" },
      { id: "LOC_APOLLO", name: "Apollo Trauma Center (Greams Rd)", sector: "Metro Center", lat: 13.0610, lng: 80.2520, type: "HOSPITAL" },
      { id: "LOC_MARINA", name: "Marina Coastal Pier Station", sector: "Coastal Basin", lat: 13.0480, lng: 80.2800, type: "COASTAL_BASE" },
      { id: "LOC_MYLAPORE", name: "Mylapore Relief Depot", sector: "Coastal Basin", lat: 13.0330, lng: 80.2670, type: "DEPOT" },
      { id: "LOC_GUINDY", name: "Guindy Disaster Base Camp", sector: "Industrial Hub", lat: 13.0070, lng: 80.2080, type: "BASE" },
      { id: "LOC_VELACHERY", name: "Velachery South Basin", sector: "Coastal Basin", lat: 12.9815, lng: 80.2180, type: "FLOOD_ZONE" },
      { id: "LOC_ADYAR", name: "Adyar River Hub", sector: "River Bridge", lat: 13.0060, lng: 80.2570, type: "BRIDGE" },
      { id: "LOC_SAIDAPET", name: "Saidapet Causeway Crossing", sector: "River Bridge", lat: 13.0230, lng: 80.2190, type: "CAUSEWAY" },
      { id: "LOC_KODAMBAKKAM", name: "Kodambakkam Arterial Flyover", sector: "Metro Center", lat: 13.0515, lng: 80.2245, type: "ARTERIAL" },
      { id: "LOC_PERAMBUR", name: "Perambur North Rail Junction", sector: "Industrial Hub", lat: 13.1110, lng: 80.2330, type: "JUNCTION" }
    ];

    defaultNodes.forEach(n => this.addNode(n.id, n));

    // 13 Bidirectional Weighted Roads (Edges) with road distances in kilometers
    const defaultEdges = [
      { from: "LOC_CENTRAL", to: "LOC_APOLLO", weight: 3.2, roadName: "Poonamallee High Rd" },
      { from: "LOC_CENTRAL", to: "LOC_PERAMBUR", weight: 4.1, roadName: "Perambur Barracks Rd" },
      { from: "LOC_CENTRAL", to: "LOC_MARINA", weight: 3.8, roadName: "Kamarajar Promenade" },
      { from: "LOC_APOLLO", to: "LOC_KODAMBAKKAM", weight: 3.5, roadName: "Mount Road Arterial" },
      { from: "LOC_APOLLO", to: "LOC_MYLAPORE", weight: 3.9, roadName: "Cathedral - TTK Rd" },
      { from: "LOC_MARINA", to: "LOC_MYLAPORE", weight: 2.8, roadName: "Santhome High Rd" },
      { from: "LOC_MYLAPORE", to: "LOC_ADYAR", weight: 3.6, roadName: "Durgabai Deshmukh Rd" },
      { from: "LOC_KODAMBAKKAM", to: "LOC_SAIDAPET", weight: 3.7, roadName: "Arcot Road" },
      { from: "LOC_SAIDAPET", to: "LOC_GUINDY", weight: 2.5, roadName: "Anna Salai South" },
      { from: "LOC_SAIDAPET", to: "LOC_ADYAR", weight: 4.2, roadName: "River Bank Link" },
      { from: "LOC_GUINDY", to: "LOC_VELACHERY", weight: 4.6, roadName: "Inner Ring Expressway" },
      { from: "LOC_ADYAR", to: "LOC_VELACHERY", weight: 5.1, roadName: "Velachery Main Rd" },
      { from: "LOC_PERAMBUR", to: "LOC_KODAMBAKKAM", weight: 7.2, roadName: "North-West Link" }
    ];

    defaultEdges.forEach(e => this.addEdge(e.from, e.to, e.weight, e.roadName));
  }

  /** Add a vertex to the graph */
  addNode(id, data) {
    this.nodes.set(id, data);
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, []);
    }
  }

  /** Add an undirected (bidirectional) weighted edge between from and to */
  addEdge(from, to, weight, roadName = "") {
    if (!this.adjacencyList.has(from)) this.adjacencyList.set(from, []);
    if (!this.adjacencyList.has(to)) this.adjacencyList.set(to, []);

    this.adjacencyList.get(from).push({ to, weight, roadName, isBlocked: false });
    this.adjacencyList.get(to).push({ to: from, weight, roadName, isBlocked: false });
  }

  /** Set dynamic obstruction status for a road segment */
  setRoadBlock(nodeA, nodeB, isBlocked) {
    const listA = this.adjacencyList.get(nodeA) || [];
    const edgeA = listA.find(e => e.to === nodeB);
    if (edgeA) edgeA.isBlocked = isBlocked;

    const listB = this.adjacencyList.get(nodeB) || [];
    const edgeB = listB.find(e => e.to === nodeA);
    if (edgeB) edgeB.isBlocked = isBlocked;
  }

  /** Synchronize road blockages with hazard zones saved in localStorage */
  syncWithHazards(hazards) {
    // Reset all road blockages
    this.adjacencyList.forEach(neighbors => {
      neighbors.forEach(edge => {
        edge.isBlocked = false;
      });
    });

    // Apply active roadblocks from hazard array
    if (Array.isArray(hazards)) {
      hazards.forEach(h => {
        if (h.active && h.nodeA && h.nodeB) {
          this.setRoadBlock(h.nodeA, h.nodeB, true);
        }
      });
    }
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllEdges() {
    const edges = [];
    const seen = new Set();
    this.adjacencyList.forEach((neighbors, from) => {
      neighbors.forEach(n => {
        const key = [from, n.to].sort().join("<->");
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            from,
            to: n.to,
            weight: n.weight,
            roadName: n.roadName,
            isBlocked: n.isBlocked
          });
        }
      });
    });
    return edges;
  }

  /** Find the closest road network node to given GPS coordinates */
  findNearestNode(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    this.nodes.forEach(node => {
      const d = Math.hypot(node.lat - lat, node.lng - lng);
      if (d < minDist) {
        minDist = d;
        nearest = node;
      }
    });
    return nearest;
  }

  /* ==========================================================================
     4. DIJKSTRA'S SHORTEST PATH ALGORITHM USING BINARY MIN-HEAP
     --------------------------------------------------------------------------
     THEORY FOR PROFESSOR / VIVA:
     - What is it? A greedy algorithm that solves the Single-Source Shortest Path
       (SSSP) problem on a weighted graph with non-negative edge weights.
     - How does it work?
       1. Maintain an array 'distances' where dist[startNode] = 0 and all others = Infinity.
       2. Maintain an array 'previous' to record the predecessor of each vertex along
          the shortest path.
       3. Insert the start node into the Binary Min-Heap with distance 0.
       4. Extract the vertex 'u' with the minimum tentative distance from the heap.
       5. For each adjacent road edge (u -> v):
          - Check if the road is blocked. If blocked, skip it!
          - Perform Edge Relaxation:
            if (dist[u] + weight(u, v) < dist[v]) {
              dist[v] = dist[u] + weight(u, v);
              previous[v] = u;
              insert (v, dist[v]) into Min-Heap;
            }
       6. Once target vertex is reached, reconstruct the shortest path by backtracking
          the 'previous' pointers from destination to origin.
     - Time Complexity:
       * Heap operations: O(V log V) to extract min vertices + O(E log V) to relax edges.
       * Total Time Complexity = O((V + E) log V).
     - Space Complexity:
       * O(V) for distance, previous, visited set, and min-heap arrays.
     ========================================================================== */
  dijkstra(startNodeId, targetNodeId, avoidBlockedRoads = true) {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(targetNodeId)) {
      return { success: false, distance: Infinity, path: [], visitedOrder: [], relaxationSteps: [] };
    }

    // Step 1: Initialize data structures
    const distances = {};
    const previous = {};
    const minHeap = new BinaryMinHeap();
    const visitedOrder = [];
    const relaxationSteps = [];

    this.nodes.forEach((_, id) => {
      distances[id] = Infinity; // Tentative distance is initially Infinity
      previous[id] = null;      // No predecessor recorded yet
    });

    // Distance to the starting vertex is zero
    distances[startNodeId] = 0;
    minHeap.insert(startNodeId, 0);

    const visitedSet = new Set();

    // Step 2: Main Dijkstra loop
    while (!minHeap.isEmpty()) {
      // Greedy Choice: Extract vertex with smallest tentative distance
      const minNode = minHeap.extractMin();
      const currentId = minNode.element;
      const currentDist = minNode.priority;

      // Skip already settled vertices (stale heap entries)
      if (visitedSet.has(currentId)) continue;
      visitedSet.add(currentId);
      visitedOrder.push(currentId);

      // Early Exit: If we reached the target vertex, the shortest path is guaranteed optimal!
      if (currentId === targetNodeId) break;

      // Step 3: Inspect all outgoing neighbor roads from current vertex
      const neighbors = this.adjacencyList.get(currentId) || [];
      for (const edge of neighbors) {
        // Roadblock Check (Requirement 2): Avoid flooded or damaged road segments
        if (avoidBlockedRoads && edge.isBlocked) {
          relaxationSteps.push({
            from: currentId,
            to: edge.to,
            weight: edge.weight,
            status: "BLOCKED_ROADBLOCK",
            note: `Road "${edge.roadName || 'Segment'}" is submerged/blocked. Bypassed by Dijkstra algorithm.`
          });
          continue; // Skip blocked edge
        }

        // Edge Relaxation Check:
        // Can we improve the distance to neighbor 'edge.to' through 'currentId'?
        const altDistance = currentDist + edge.weight;
        if (altDistance < distances[edge.to]) {
          relaxationSteps.push({
            from: currentId,
            to: edge.to,
            oldDist: distances[edge.to] === Infinity ? '∞' : Number(distances[edge.to].toFixed(2)),
            newDist: Number(altDistance.toFixed(2)),
            status: "RELAXED",
            note: `Shortest distance updated to ${altDistance.toFixed(2)} km via "${edge.roadName || 'Road'}". Inserted into Min-Heap.`
          });

          distances[edge.to] = altDistance;
          previous[edge.to] = currentId;
          // Insert the updated shorter distance into the Min-Heap
          minHeap.insert(edge.to, altDistance);
        }
      }
    }

    // Step 4: Reconstruct shortest path by backtracking previous pointers
    const path = [];
    let curr = targetNodeId;
    if (distances[targetNodeId] !== Infinity || startNodeId === targetNodeId) {
      while (curr !== null) {
        path.unshift(curr);
        curr = previous[curr];
      }
    }

    const pathNodes = path.map(id => this.nodes.get(id));
    const totalDistance = distances[targetNodeId] === Infinity ? 0 : Number(distances[targetNodeId].toFixed(2));

    return {
      success: path.length > 0 && distances[targetNodeId] !== Infinity,
      distance: totalDistance,
      path,
      pathNodes,
      visitedOrder,
      relaxationSteps,
      visitedCount: visitedSet.size
    };
  }

  /**
   * Requirement 8: Automatic Assignment of the Nearest Available Responder
   * Runs Dijkstra's algorithm from all available units to the target incident location
   * and returns the responder with the minimum road distance.
   */
  findNearestAvailableResponder(targetLocationNodeId, respondersList, avoidBlockedRoads = true) {
    const available = respondersList.filter(r => r.status === "AVAILABLE" || r.availability === "AVAILABLE");
    if (available.length === 0) {
      return { found: false, message: "No responders are currently available in the fleet." };
    }

    let bestResponder = null;
    let shortestDist = Infinity;
    let bestDijkstraResult = null;

    available.forEach(responder => {
      // Determine responder's current location node
      let responderNodeId = responder.nodeId;
      if (!responderNodeId || !this.nodes.has(responderNodeId)) {
        const nearestNode = this.findNearestNode(responder.lat, responder.lng);
        responderNodeId = nearestNode ? nearestNode.id : "LOC_CENTRAL";
      }

      // Execute Dijkstra Shortest Path using the Binary Min-Heap
      const result = this.dijkstra(responderNodeId, targetLocationNodeId, avoidBlockedRoads);
      if (result.success && result.distance < shortestDist) {
        shortestDist = result.distance;
        bestResponder = responder;
        bestDijkstraResult = result;
      }
    });

    // Fallback: If road network was fully blocked under hazard constraint, try unblocked path
    if (!bestResponder) {
      available.forEach(responder => {
        let responderNodeId = responder.nodeId || this.findNearestNode(responder.lat, responder.lng)?.id || "LOC_CENTRAL";
        const result = this.dijkstra(responderNodeId, targetLocationNodeId, false);
        if (result.success && result.distance < shortestDist) {
          shortestDist = result.distance;
          bestResponder = responder;
          bestDijkstraResult = result;
        }
      });
    }

    if (!bestResponder) {
      return { found: false, message: "No traversable route found from any responder to incident location." };
    }

    return {
      found: true,
      responder: bestResponder,
      distanceKm: shortestDist,
      dijkstraResult: bestDijkstraResult
    };
  }
}

// Global instances initialized for application use
window.rescueMinHeap = new BinaryMinHeap();
window.rescuePriorityQueue = new EmergencyPriorityQueue();
window.rescueRoadNetwork = new CityRoadNetwork();
