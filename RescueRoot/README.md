# RescueRoute — Intelligent Emergency Resource and Rescue Coordinator

A professional, modern Emergency Operations Center & Disaster Management application built with pure **HTML5, CSS3, and vanilla JavaScript**. It coordinates emergency rescue units, computes optimal safe routes using **Dijkstra's Shortest Path Algorithm with a Binary Min-Heap**, prioritizes life-threatening calls using an **Emergency Priority Queue**, and manages evacuation shelters and acoustic warning sirens.

---

## 📌 Project Overview & Problem Statement

### 1. Problem Statement
During extreme weather events and urban disasters (such as the Chennai or Mumbai monsoon inundations), urban emergency services face catastrophic bottlenecks:
- **Flawed Standard Navigation**: Commercial civilian navigation tools route emergency ambulances through the shortest geographic paths without awareness of flood depth, causing vehicles to stall in inundated underpasses or at damaged bridges.
- **Triage Misallocation**: Standard dispatch queues operate on a First-In, First-Out (FIFO) basis. When hundreds of distress calls arrive simultaneously, minor property queries take precedence over trapped ICU patients or building collapses simply because they were logged earlier.
- **Resource Desynchronization**: Command centers lack real-time visibility into responder availability, leading to ambulances being assigned to multiple sites while available units remain idle.

### 2. Project Objectives
- **Intelligent Triage Prioritization**: Implement an Emergency Priority Queue that dynamically sorts calls by life-threat severity and victim counts.
- **Hazard-Aware Safe Routing**: Model the city as a weighted graph and execute Dijkstra's algorithm with a Binary Min-Heap to find routes that strictly bypass active roadblocks and flood hazards.
- **Nearest Available Responder Matching**: Automate multi-unit distance calculations to dispatch the closest ready responder in real time.
- **Zero-Dependency Resilience**: Run purely on vanilla client-side technologies (HTML, CSS, JS) with local browser persistence (`localStorage`), zero external build tools, and an automatic vector SVG fallback map for offline operations.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure, modal dialogs, accessible forms, audio visualizer canvas |
| **CSS3** | High-contrast emergency dashboard theme, dark navy sidebar, responsive grid, animations |
| **Vanilla JavaScript (ES6+)** | Pure client-side logic, custom data structures, graph algorithms, DOM updates |
| **Web Audio API** | Harmonic oscillator synthesizer for emergency sirens and alert beeps (zero external audio files) |
| **Leaflet.js + CartoDB** | Interactive spatial GIS map for GPS coordinate tracking and corridor rendering |
| **Inline Vector SVG** | Zero-dependency offline fallback map and dynamic responsive analytics charts |
| **Browser LocalStorage** | Persistent state storage for incidents, fleet statuses, shelters, and audit trail |

---

## 🚀 How to Launch the Application

1. **No compilers, GCC, Node.js, npm, or backend server are required.**
2. Simply double-click or open:
   ```text
   public/index.html
   ```
   in **Google Chrome** (or Microsoft Edge, Brave, Firefox).
3. The application runs immediately as a standalone client-side web application. All data automatically persists in your browser using `localStorage`.

---

## 🌟 Key Features

### 1. Real-Time Dashboard KPI Cards
- **Total Incidents**: Live count of all emergency cases logged across city sectors.
- **Critical Incidents**: High-priority life threats currently placed at the top of the Priority Queue.
- **Available Responders**: Ratio of ready units (ambulances, NDRF boats, fire tenders, drones) on standby versus total fleet.
- **Resolved Incidents**: Real-time counter of cleared incidents where victims have been secured.

### 2. Emergency Incident Intake & Priority Queue Triage
- **Priority Queue Engine**: Incoming calls are enqueued into an emergency priority queue based on severity:
  - **Level 4 — CRITICAL**: Immediate life threat (cardiac arrest, active structural fire, roof collapse).
  - **Level 3 — HIGH**: Rapidly rising water, severe injury.
  - **Level 2 — MODERATE**: Trapped but medically stable.
  - **Level 1 — LOW**: Property damage or precautionary advisory.
- **Tie-Breaking Logic**: Evaluates victim counts and report timestamps.
- **Incident Management**:
  - Interactive incident cards displaying severity tags, priority queue ranks (`PQ Rank #1`, `PQ Rank #2`), and trapped victim counts.
  - **"+ Report Incident" Modal**: Form to register new SOS calls with sector, GPS coordinates, and required gear.

### 3. City Road Network (Weighted Graph)
- **10 Strategic Urban Transit Hubs**:
  1. `LOC_CENTRAL`: Central Railway & Metro Hub
  2. `LOC_APOLLO`: Apollo Trauma Center (Greams Rd)
  3. `LOC_MARINA`: Marina Coastal Pier Station
  4. `LOC_MYLAPORE`: Mylapore Relief Depot
  5. `LOC_GUINDY`: Guindy Disaster Base Camp
  6. `LOC_VELACHERY`: Velachery South Flood Basin
  7. `LOC_ADYAR`: Adyar River Hub
  8. `LOC_SAIDAPET`: Saidapet Causeway Crossing
  9. `LOC_KODAMBAKKAM`: Kodambakkam Arterial Flyover
  10. `LOC_PERAMBUR`: Perambur North Rail Junction
- **13 Weighted Bidirectional Roads**: Stored as an **Adjacency List** with realistic road distances in kilometers.
- **Dynamic Roadblocks**: Flooded underpasses and collapsed bridges dynamically block graph edges, forcing route recalculations.

### 4. Dijkstra's Shortest-Path Algorithm & Binary Min-Heap
- **Binary Min-Heap Implementation**: Built from scratch in `public/js/dsa.js` to manage priority extraction in $O(\log V)$ time instead of a linear $O(V)$ search.
- **Greedy Edge Relaxation**: Calculates the mathematically shortest traversable path between any two locations in the city.
- **Safe Corridor Bypass**: When hazard avoidance is active, Dijkstra skips blocked road segments and routes around hazards.

### 5. Responder Fleet Management & Nearest Responder Assignment
- **Responder Status Tracking**: Shows exact **Location**, **Availability** (`AVAILABLE`, `EN_ROUTE`, `ON_SCENE`, `MAINTENANCE`), and **Assigned Incident**.
- **⚡ Assign Nearest (Dijkstra)**: Runs Dijkstra's algorithm across all available responders to find the unit with the minimum road travel distance to the emergency.
- **Resolution & Responder Freeing**:
  - Clicking **"✓ Resolve"** marks an incident as resolved, rescues all victims, and automatically frees the assigned responder back to `AVAILABLE`.
  - Responders can also be manually freed using **"✓ Free Responder"**.

### 6. Highlighted Route Visualization
- **Corridor Highlighting**: Draws the optimal rescue route on both the Leaflet map and the zero-dependency SVG vector fallback map.
- **Route Highway Sequence**: Displays sequential waypoints (`[Central] ➔ Poonamallee High Rd ➔ [Apollo] ➔ Cathedral Rd ➔ [Mylapore]`) and exact total distance in kilometers.

### 7. Evacuation Shelters & Supply Stockpiles
- **Shelter Capacity Tracking**: Monitors occupancy percentages, food days remaining, and medical doctor presence.
- **Evacuee Allocation**: Modal interface to safely transfer rescued victims to camps with capacity validation.
- **Stockpile Inventory**: Tracks oxygen cylinders, trauma packs, inflatable lifejackets, and rations with a one-click restock button.

### 8. Acoustic Siren Synthesizer & Public Broadcast
- **Web Audio API Sound Engine**: Pure client-side harmonic synthesizer producing authentic rising/falling disaster warning sirens, radio alert beeps, and dispatch chirps (**no external audio files required**).
- **Public Emergency Bulletins**: Transmits multi-channel advisory alerts across radio, cell broadcast, and public address sirens.

### 9. LocalStorage Persistence & Reset Demo
- **Automatic State Persistence**: Incidents, fleet readiness, shelters, supplies, and audit logs persist across browser refreshes.
- **"Reset Demo Data" Button**: Restores the default scenario at any time for presentations.

### 10. DSA Insights & Live Algorithm Inspector
- Dedicated **"DSA Insights & Complexity"** tab explaining:
  - Binary Min-Heap operations
  - Priority Queue emergency triage
  - Graph representation
  - Dijkstra's edge relaxation ledger
  - Interactive Dijkstra tester where you can select start and destination nodes and view the step-by-step heap relaxation table.

---

## 🧠 Data Structures & Algorithms (DSA) Deep-Dive

### 1. Emergency Priority Queue (Triage Queue)
- **Problem**: During a natural disaster, hospital basements flood and structures collapse simultaneously. A standard First-In-First-Out (FIFO) queue would treat a minor power outage ahead of trapped cardiac patients if the outage was reported first.
- **Solution**: An Emergency Priority Queue sorts calls by **Triage Severity**:
  $$\text{Severity Level: } \text{CRITICAL (4)} > \text{HIGH (3)} > \text{MODERATE (2)} > \text{LOW (1)}$$
- **Operation**:
  - `enqueue(incident)`: Places call in the queue in $O(\log N)$ time.
  - `dequeue()`: Extracts highest-priority life threat in $O(1)$ peek / $O(\log N)$ extraction.

### 2. City Road Network Graph (Adjacency List)
- **Representation**: Stored as a Hash Map of node IDs to arrays of neighbor objects:
  ```js
  adjacencyList = {
    "LOC_CENTRAL": [
      { to: "LOC_APOLLO", weight: 3.2, roadName: "Poonamallee High Rd", isBlocked: false },
      { to: "LOC_PERAMBUR", weight: 4.1, roadName: "Perambur Barracks Rd", isBlocked: false },
      { to: "LOC_MARINA", weight: 3.8, roadName: "Kamarajar Promenade", isBlocked: false }
    ], ...
  }
  ```
- **Why Adjacency List over Adjacency Matrix?**: An urban street network is sparse ($E \ll V^2$). An adjacency list requires only $O(V + E)$ space compared to $O(V^2)$ for a matrix, and allows iterating over neighbors in $O(\text{deg}(v))$ time.

### 3. Binary Min-Heap
- **Structure**: A complete binary tree stored in a 1D array where every parent node satisfies the min-heap property:
  $$\text{heap}[\text{parent}(i)].\text{priority} \le \text{heap}[i].\text{priority}$$
- **Array Index Relationships**:
  $$\text{parent}(i) = \lfloor \frac{i - 1}{2} \rfloor, \quad \text{left}(i) = 2i + 1, \quad \text{right}(i) = 2i + 2$$
- **Operations**:
  - `insert(element, priority)`: Appends to end of array and calls `bubbleUp()` ($O(\log V)$).
  - `extractMin()`: Swaps root with last element, pops, and calls `bubbleDown()` ($O(\log V)$).

### 4. Dijkstra's Shortest Path Algorithm
- **Mechanism**:
  1. Initialize `dist[v] = Infinity` for all vertices; `dist[source] = 0`.
  2. Insert `(source, 0)` into the Binary Min-Heap.
  3. While heap is not empty, extract vertex $u$ with minimum distance.
  4. For each neighbor $v$ of $u$, check if road is blocked. If open, evaluate relaxation condition:
     $$\text{if } \text{dist}[u] + \text{weight}(u, v) < \text{dist}[v] \implies \text{dist}[v] = \text{dist}[u] + \text{weight}(u, v)$$
  5. Reconstruct the shortest path by backtracking previous pointers from destination to origin.

---

## 📊 Time & Space Complexity Analysis

| Component | Operation | Time Complexity | Space Complexity | Real-World Role in RescueRoute |
|---|---|---|---|---|
| **Binary Min-Heap** | `insert()` | $O(\log V)$ | $O(V)$ | Adds discovered vertices with updated tentative distances |
| **Binary Min-Heap** | `extractMin()` | $O(\log V)$ | $O(V)$ | Retrieves the closest unvisited vertex in logarithmic time |
| **Binary Min-Heap** | `peek()` | $O(1)$ | $O(1)$ | Inspects minimum distance vertex |
| **Priority Queue (Triage)** | `enqueue()` / `dequeue()` | $O(\log N)$ | $O(N)$ | Maintains triage ordering so critical emergencies are served first |
| **Graph (Adjacency List)** | `getNeighbors(u)` | $O(\text{deg}(u))$ | $O(V + E)$ | Memory-efficient urban intersection lookup ($10$ nodes, $13$ roads) |
| **Dijkstra's Algorithm** | Shortest Route Search | $O((V + E) \log V)$ | $O(V)$ | Fast route calculation avoiding flooded/blocked road sectors |
| **Nearest Responder Search** | Multi-Unit Search | $O(K \cdot (V + E) \log V)$ | $O(V)$ | Evaluates $K$ available responders to pick closest unit |

*Where $V$ is number of locations ($10$), $E$ is number of road segments ($13$), and $N$ is pending incidents.*

---

## 🎯 Step-by-Step Demo & Viva Presentation Guide

Follow these steps to demonstrate every feature to evaluators or professors:

### Step 1: Verification of Dashboard Cards (Requirement 1)
1. Open `public/index.html` in Google Chrome.
2. Observe the top KPI cards:
   - **Total Incidents**: Initial count is `7`.
   - **Critical Incidents**: Displays `3` (Critical life threats).
   - **Available Responders**: Displays `5 / 8` available units.
   - **Resolved Incidents**: Displays `1` (Pre-existing resolved incident).

### Step 2: Testing Nearest Responder Assignment via Dijkstra (Requirements 5, 6, 8, 9)
1. Click the top button: **"⚡ Assign Nearest (Dijkstra)"**.
2. **What happens**:
   - The system inspects the Emergency Priority Queue and identifies the highest-priority emergency (`INC-101` or `INC-104`).
   - Dijkstra's algorithm runs using the Binary Min-Heap across all available responders.
   - It identifies the closest available unit, dispatches it, highlights the corridor on the map, and displays the exact road sequence and distance.
   - Notice the "Available Responders" card decrements in real-time.

### Step 3: Resolving an Incident & Freeing Responders (Requirements 7, 10)
1. In the sidebar, click **"Fleet & Unit Dispatch"** or **"Incidents & SOS Intake"**.
2. In the responder list, notice each responder clearly shows:
   - **Location** (e.g., *Apollo Medical Depot*, *Saidapet Causeway*)
   - **Availability** (`AVAILABLE`, `EN_ROUTE`, `ON_SCENE`)
   - **Assigned Incident** (e.g., `INC-102`)
3. On an active incident card, click **"✓ Resolve"**.
4. **What happens**:
   - The incident moves to `RESOLVED`.
   - The assigned responder is instantly freed and marked **`AVAILABLE`**.
   - The **"Resolved Incidents"** KPI card increments immediately!

### Step 4: Adding a New Emergency & Testing Priority Queue (Requirements 2, 3)
1. Click **"+ Report Incident"** (top right).
2. Enter a caller name, select **Incident Type: Structural Fire**, and set **Severity: CRITICAL**.
3. Submit the form.
4. Go to **"Incidents & SOS Intake"**: observe the new incident is placed at the top of the list with a **`PQ Rank #1`** badge because of its Critical weight.

### Step 5: Testing Interactive Roadblock Re-routing (Requirements 2, 4, 9)
1. Go to **"Intelligent Safe Routing"** tab.
2. Select **Origin**: `LOC_CENTRAL` and **Destination**: `LOC_VELACHERY`.
3. Click **"Calculate Optimal Path"**: note the safe distance and highway sequence.
4. Toggle the **"Velachery Main Underpass Inundation"** roadblock switch ON/OFF:
   - Notice how Dijkstra re-routes around the blocked road, updating the route distance and ETA in real-time.

### Step 6: Exploring the DSA Insights Tab (Requirement 14)
1. Click **"DSA Insights & Complexity"** in the sidebar.
2. Review the beginner-friendly explanations and the Time/Space complexity table.
3. Under **Interactive Dijkstra Shortest-Path Tester**, select any start node and end node, and click **"Compute Shortest Path via Binary Min-Heap"**:
   - Observe the live **Dijkstra Edge Relaxation Ledger** displaying the exact step-by-step heap updates, tentative distance changes, and blocked road handling.
4. Under **Emergency Priority Queue (Triage Inspector)**, observe the live ordered list of pending emergencies.

### Step 7: Testing LocalStorage Persistence & Reset (Requirements 11, 13)
1. Refresh the browser (`F5` or `Ctrl + R`).
2. Notice all dispatched units, resolved incidents, and newly reported cases **persist completely**.
3. Click the **Reset** icon (circular arrow in top right) and confirm:
   - The project instantly restores to its pristine demo state.

### Step 8: Testing Offline Acoustic Siren
1. In the sidebar footer, click **"🚨 Test Emergency Siren"** or open **"Public Broadcast & Siren"**.
2. Click **"Play Continuous Disaster Warning Siren"**:
   - Web Audio API oscillators synthesize a real emergency siren wail in real-time with zero internet or external audio files.

---

## 🎤 2-Minute Project Presentation Script (For College Review)

> **"Respected Evaluators,**
> 
> In natural disasters such as urban flash floods, traditional emergency systems face two fatal flaws: **delayed triage** and **blind routing into impassable hazards**.
> 
> Our project, **RescueRoute — Intelligent Emergency Resource and Rescue Coordinator**, solves this by combining core Data Structures and Algorithms with a modern Command and Control interface.
> 
> **First, for Triage:** Instead of a First-In-First-Out queue, we implemented an **Emergency Priority Queue** with custom comparator logic. Incoming calls are rated from Level 1 Low to Level 4 Critical. Even if a minor call arrives earlier, the priority queue guarantees that cardiac emergencies and trapped infants are extracted and dispatched first.
> 
> **Second, for Routing:** We modeled the urban transit corridors as a **Weighted Graph using an Adjacency List** with 10 strategic hubs and 13 roads. To find the safest route, we implemented **Dijkstra's Algorithm powered by a custom Binary Min-Heap**. This reduces the time complexity from $O(V^2)$ down to $O((V + E) \log V)$. When roads are submerged, the algorithm dynamically skips blocked edges and computes safe alternative corridors.
> 
> **Third, for Dispatching:** When an emergency occurs, our algorithm evaluates all available responders, runs Dijkstra's algorithm from each unit's station, and automatically assigns the unit with the minimal travel distance. When the rescue is complete, clicking 'Resolve' frees the responder back to available status.
> 
> The application is 100% self-contained in HTML, CSS, and Vanilla JavaScript with browser LocalStorage persistence, an offline vector SVG fallback map, and a Web Audio API acoustic siren synthesizer.
> 
> Thank you! We are now ready to demonstrate the live system."

---

## ❓ Frequently Asked Viva Questions & Answers

### Q1: Why did you use an Adjacency List instead of an Adjacency Matrix for the road network?
> **Answer**: Road networks are sparse graphs where each intersection connects to only 2 to 4 roads ($E \ll V^2$). An adjacency matrix would consume $O(V^2)$ memory with mostly zero entries. An **Adjacency List** uses only $O(V + E)$ memory and allows iterating over adjacent roads in $O(\text{deg}(v))$ time, which significantly speeds up Dijkstra's edge relaxation.

### Q2: How does the Binary Min-Heap optimize Dijkstra's Algorithm?
> **Answer**: In basic Dijkstra, finding the unvisited vertex with the minimum distance requires scanning an array in $O(V)$ time, leading to $O(V^2)$ total complexity. By using a **Binary Min-Heap**, the minimum distance vertex is always at index 0 and can be extracted in $O(\log V)$ time. Edge relaxations insert updated distances in $O(\log V)$, reducing overall complexity to $O((V + E) \log V)$.

### Q3: What is "Edge Relaxation" in Dijkstra's algorithm?
> **Answer**: Relaxation is the process of testing whether going through a vertex $u$ improves the shortest known path to its neighbor $v$:
> $$\text{if } \text{dist}[u] + \text{weight}(u, v) < \text{dist}[v] \implies \text{dist}[v] = \text{dist}[u] + \text{weight}(u, v)$$
> If true, we update $\text{dist}[v]$, record $u$ as predecessor, and insert $v$ into the min-heap.

### Q4: Why can't we use BFS (Breadth-First Search) instead of Dijkstra?
> **Answer**: Standard BFS only works for **unweighted graphs** where every road edge has equal weight (distance 1). In real urban networks, roads have different lengths (e.g. 2.5 km vs 7.2 km). Dijkstra's algorithm account for weighted edges using a greedy distance-based approach.

### Q5: How does your system handle offline situations where internet is disconnected?
> **Answer**: 
> 1. The code is written purely in Vanilla JavaScript without any npm or server runtime.
> 2. The map features an automatic **Vector SVG Fallback Engine** that renders the complete city shoreline, graph network, hazard circles, and route corridors directly using native browser SVG if map tiles cannot load.
> 3. The emergency siren uses the browser's native **Web Audio API** oscillators, requiring zero external MP3 downloads.

---

## ⚠️ Limitations & Future Enhancements

### Limitations
- The road network currently simulates 10 primary sectors with 13 connecting corridors.
- Real-time traffic speed variations are simulated based on vehicle capability profiles rather than live municipal camera feeds.

### Future Enhancements
- **Dynamic Real-Time Rainfall Influx**: Integrate open hydrological telemetry APIs to dynamically increase flood water depth based on upstream rainfall millimeters.
- **Drone Swarm Flight Paths**: Expand 3D volumetric pathfinding for automated aerial delivery drones considering wind shear vectors.
- **Citizen SOS Mobile App**: Connect via WebSockets to enable citizens to submit geotagged photos of rising water levels.

---

## 📁 File Structure

```text
RescueRoot/
├── public/
│   ├── css/
│   │   └── style.css            # Responsive emergency operations dashboard theme
│   ├── js/
│   │   ├── data.js              # Initial dataset, domain models, LocalStorage store
│   │   ├── dsa.js               # BinaryMinHeap, EmergencyPriorityQueue, CityRoadNetwork, Dijkstra
│   │   ├── audio.js             # Web Audio API emergency siren & alert synthesizer
│   │   ├── routing.js           # Spatial hazard avoidance & waypoint interpolation
│   │   ├── map.js               # Leaflet map + zero-dependency SVG vector fallback
│   │   ├── dispatcher.js        # Automated Priority Queue & Dijkstra dispatch engine
│   │   └── app.js               # Application coordinator, simulation clock, modals, SVG charts
│   └── index.html               # Main entry point — open in Google Chrome
└── README.md                    # Project documentation, viva guide & presentation script
```
