import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { KMZLoader } from 'jsm/loaders/KMZLoader.js';
import { FontLoader } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";

// Using D3.js Treemap layout to position (x,y,z) of districts and buildings correctly and dynamically without overlapping
import * as d3 from "d3";

let camera, scene, renderer;

const colors = [0x78A8B8, 0xa7cfcb, 0x63392c, 0xf7b29c, 0xf5d9c1];

// Global object to track reserved areas for each parent ground
const reservedAreas = {};

// To track buildings positions as they are being added dynamically, to be used for connection lines later
const buildingPositionArray = [];

// Store communication lines here
const communicationLines = [];

// This should be passed from Java
const examplePackageName = 'org.jsoup.examples';

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x999999);

    // Main directional light (with shadows enabled)
    const light = new THREE.DirectionalLight(0xc3c7c7, 5);
    light.position.set(0.5, 1.0, 0.5).normalize();
    // Enable shadow casting for the light
    light.castShadow = true;
    scene.add(light);

    // Add ambient light to evenly illuminate the scene, soft white light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Camera setup
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 500);
    // Lift the camera higher to see both cubes and ground clearly
    camera.position.y = 10;
    camera.position.z = 20;

    scene.add(camera);

    // Create a grid helper to show the grid on the ground
    const grid = new THREE.GridHelper(150, 150, 0xffffff, 0xc3c7c7);
    scene.add(grid);


    const grounds = [

        { scaleX: 40, scaleZ: 40, label: 'org.jsoup' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.nodes' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.select' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.select.1' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.safety' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.helper' },
        { scaleX: 10, scaleZ: 10, label: 'org.jsoup.parser' },
        { scaleX: 20, scaleZ: 20, label: 'org.jsoup.examples' }
    ];

    const buildings = [
        { label: 'Attribute', scaleX: 1, scaleY: 10, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.nodes', connections: ['1', '2'], lineText: ['hi', 'bey'] },
        { label: 'UncheckedIOException', scaleX: 2, scaleY: 10, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup', connections: ['1', '2'], lineText: [] },
        { label: 'Document', scaleX: 5, scaleY: 20, scaleZ: 5, color: getRandomColor(), package: 'org.jsoup.nodes', connections: [], lineText: [] },
        { label: 'DataNode', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '1', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '2', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '3', scaleX: 2, scaleY: 1, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '4', scaleX: 1, scaleY: 3, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '5', scaleX: 4, scaleY: 1, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '1', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '2', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '3', scaleX: 2, scaleY: 1, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '4', scaleX: 1, scaleY: 3, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: '5', scaleX: 2, scaleY: 1, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup.select.1', connections: [], lineText: [] },
        { label: 'Node', scaleX: 4, scaleY: 10, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.nodes', connections: ['1'], lineText: [] },
        { label: '1', scaleX: 4, scaleY: 4, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.examples', connections: [], lineText: [] },
        { label: '2', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.examples', connections: [], lineText: [] }
    ];

    // Use treemap from D3.js
    const hierarchyGroundsData = buildPackageHierarchy(grounds);
    const layoutGroundsData = applyTreemapLayout(hierarchyGroundsData);
    centerLayout(layoutGroundsData);

    // Recursively create all grounds in the scene
    createGroundFromTreemap(layoutGroundsData, 0, buildings, scene);

    // Create communication lines between the buildings
    createConnections();

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Enable shadow map
    renderer.shadowMap.enabled = true;
    // Optional, for softer shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.update();

    // Resize event listener
    window.addEventListener('resize', onWindowResize);

    // Add GUI for toggling communication lines
    const gui = new lil.GUI();
    const settings = { hideCommunicationLines: false };
    gui.add(settings, 'hideCommunicationLines').name('Hide Communication Lines').onChange(toggleCommunicationLines);

    render();

}

// function to create communication lines between buildings 
function createConnections() {
    buildingPositionArray.forEach(building => {
        if (building.connections && building.connections.length > 0) {
            building.connections.forEach((connectionLabel, index) => {
                // Ensure connectionLabel is defined within the loop
                if (!connectionLabel) return;

                // Find the target building with the matching label
                const targetBuilding = buildingPositionArray.find(b => b.label === connectionLabel && b.package === examplePackageName);

                if (targetBuilding) {
                    // Get the label text based on the index
                    const lineText = building.lineText[index] || "";

                    // Randomize the curve height slightly for each line, so they do not appear as one line
                    const curveHeight = 25 + Math.random() * 10;

                    // Create a communication line between the current building and the target building
                    const communicationLine = createCommunicationLine(
                        new THREE.Vector3(building.position.x, building.position.y, building.position.z),
                        new THREE.Vector3(targetBuilding.position.x, targetBuilding.position.y, targetBuilding.position.z),
                        curveHeight,
                        lineText,
                        building.color
                    );

                    communicationLines.push(communicationLine);
                } else {
                    console.warn(`Connection target '${connectionLabel}' for building '${building.label}' not found.`);
                }
            });
        }
    });
}


// Function to create communication lines between cubes
function createCommunicationLine(start, end, curveHeight, label, color) {
    const middlePoint = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(start.y, end.y) + curveHeight,
        (start.z + end.z) / 2
    );

    // Create a curve from the start point, through the middle, to the end point
    const curve = new THREE.CatmullRomCurve3([start, middlePoint, end]);

    // Create a tube geometry to represent the curve
    const tubeGeometry = new THREE.TubeGeometry(curve, 200, 0.1, 5, false);

    const tubeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
    });

    // Create a mesh from the tube geometry and material
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    addHoverLabel(label, tube);

    scene.add(tube);

    return tube;
}

// Function to toggle visibility of communication lines
function toggleCommunicationLines(isHidden) {
    communicationLines.forEach(line => {
        line.visible = !isHidden;
    });
    render();
}


function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function buildPackageHierarchy(grounds) {
    // Root of hierarchy
    const root = { name: 'root', children: [] };

    // Create hierarchical structure by nesting packages
    grounds.forEach(ground => {
        const parts = ground.label.split('.');
        let currentLevel = root;

        parts.forEach((part, index) => {
            // Look for an existing child node
            let child = currentLevel.children.find(c => c.name === part);
            if (!child) {
                child = index === parts.length - 1
                    ? { ...ground, name: part, children: [] }  // Leaf node
                    : { name: part, children: [] };  // Non-leaf node

                currentLevel.children.push(child);
            }

            // Move down the hierarchy
            currentLevel = child;
        });
    });

    return root;
}

// Apply D3 treemap layout to assign positions within parent bounds
function applyTreemapLayout(rootNode) {
    const root = d3.hierarchy(rootNode)
        .sum(d => d.scaleX * d.scaleZ)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        // Fixed layout size for consistent centering
        .size([150, 150])
        .padding(1)
        .round(true)(root);

    return root;
}

function centerLayout(root) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    root.each(node => {
        if (node.x0 < minX) minX = node.x0;
        if (node.y0 < minZ) minZ = node.y0;
        if (node.x1 > maxX) maxX = node.x1;
        if (node.y1 > maxZ) maxZ = node.y1;
    });

    const layoutCenterX = (minX + maxX) / 2;
    const layoutCenterZ = (minZ + maxZ) / 2;

    root.each(node => {
        node.x0 -= layoutCenterX;
        node.x1 -= layoutCenterX;
        node.y0 -= layoutCenterZ;
        node.y1 -= layoutCenterZ;
    });
}

// Recursive function to position and render grounds based on treemap data
function createGroundFromTreemap(ground, level, buildings, scene) {
    const { x0, y0, x1, y1 } = ground;
    const width = x1 - x0;
    const depth = y1 - y0;
    const x = x0 + width / 2;
    const z = y0 + depth / 2;
    const y = level * 0.4;

    const lightness = Math.max(100 - level * 15, 0);
    const color = new THREE.Color(`hsl(0, 0%, ${lightness}%)`);
    const label = ground.data?.label ? ground.data.label.split('.').pop() : "";

    createGround(width, depth, color, x, y, z, label);

    if (isParent(ground)) {
        // Initialize reserved area for the parent ground
        reservedAreas[ground.data.label] = { x: x0, z: y0, width: width, depth: depth, usedX: x0, usedZ: y0 };

        // Place child grounds and reserve their spaces
        ground.children.forEach(child => {
            createGroundFromTreemap(child, level + 1, buildings, scene);

            // After placing child grounds, update the reserved area
            const childWidth = child.x1 - child.x0;
            const childDepth = child.y1 - child.y0;

            // Add some padding
            reservedAreas[ground.data.label].usedX += childWidth + 1;

            // Reset X and move Z down when exceeding parent width
            if (reservedAreas[ground.data.label].usedX + childWidth > x1) {
                reservedAreas[ground.data.label].usedX = x0;
                reservedAreas[ground.data.label].usedZ += childDepth + 1;
            }
        });

        // Place parent buildings in the remaining space within the reserved area
        const parentBuildings = buildings.filter(b => b.package === ground.data.label);
        let currentX = reservedAreas[ground.data.label].usedX;
        let currentZ = reservedAreas[ground.data.label].usedZ;
        const buildingPadding = 0.5;

        parentBuildings.forEach(building => {
            const buildingWidth = building.scaleX;
            const buildingDepth = building.scaleZ;

            // Ensure the building is within the reserved area boundaries
            if (currentX + buildingWidth > x1) {
                // Reset to start of row
                currentX = x0;
                // Move down for a new row
                currentZ += buildingDepth + buildingPadding;
            }

            // Position the building
            const posX = currentX + buildingWidth / 2;
            const posY = y + 0.5;
            const posZ = currentZ + buildingDepth / 2;

            createBuilding(building.label, posX, posY, posZ, building.scaleX, building.scaleY, building.scaleZ, building.color);

            // Push building information to the global positionsArray
            buildingPositionArray.push({
                label: building.label,
                package: building.package,
                position: { x: posX, y: posY, z: posZ },
                connections: building.connections || [],
                lineText: building.lineText || [],
                color: building.color
            });

            // Update current position
            currentX += buildingWidth + buildingPadding;
        });
    } else {
        // Handle leaf grounds without children/othergrounds on top of them
        const groundBuildings = buildings.filter(b => b.package === ground.data.label);
        if (groundBuildings.length > 0) {
            const layoutBuildingsData = applyBuildingTreemapLayout(groundBuildings, width, depth);
            layoutBuildingsData.children.forEach(buildingData => {
                createBuildingFromData(buildingData, x, y, z, width, depth);
            });
        }

        if (ground.children) {
            ground.children.forEach(child => createGroundFromTreemap(child, level + 1, buildings, scene));
        }
    }
}

function isParent(ground) {
    return Array.isArray(ground.children) && ground.children.length > 0;
}


// Treemap layout function for buildings
function applyBuildingTreemapLayout(buildings, width, depth) {
    const root = d3.hierarchy({ children: buildings })
        // Summing area as the product of width and depth
        .sum(d => d.scaleX * d.scaleZ)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, depth])
        .padding(1)(root);

    return root;
}

// Function to create a ground (district) and add a label
function createGround(width, depth, color, x, y, z, labelText) {
    const groundGeometry = new THREE.BoxGeometry(width, 0.5, depth);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 150,
        specular: 0x111111
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    ground.position.set(x, y, z);
    scene.add(ground);

    // Automatically add a label at the bottom center of the ground/district 
    const labelX = x - 1;
    const labelZ = z + depth / 2.1;
    const labelY = y + 0.2;

    addGroundLabel(labelText, labelX, labelY, labelZ, 1.5);
}

// Helper function to create a building dynamically positioned within ground bounds
function createBuildingFromData(buildingData, groundX, groundY, groundZ, width, depth) {
    const { x0, y0, x1, y1 } = buildingData;
    const building = buildingData.data;
    const posX = groundX + (x0 + x1) / 2 - width / 2;
    const posZ = groundZ + (y0 + y1) / 2 - depth / 2;
    const posY = groundY + 0.5;

    createBuilding(building.label, posX, posY, posZ, building.scaleX, building.scaleY, building.scaleZ, building.color);

    // Push building information to the global positionsArray
    buildingPositionArray.push({
        label: building.label,
        package: building.package,
        position: { x: posX, y: posY, z: posZ },
        connections: building.connections || [],
        lineText: building.lineText || [],
        color: building.color
    });
}

// Function to load a cube (building) with a hoverable label, pos is where the building is on the grid, scale is the size of the buidng where y is length, x is width, and z is height
function createBuilding(label, posX, posY, posZ, scaleX, scaleY, scaleZ, color) {
    // Create a Box geometry with the provided scale values
    const geometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const box = new THREE.Mesh(geometry, material);

    // Adjust box position to sit directly on the ground
    const offset = 0.3; // Try values like 0.01, 0.05, or 0.1 if needed
    box.position.set(posX, posY + (scaleY / 2) - offset, posZ);
    box.castShadow = true;

    // Add the box to the scene
    scene.add(box);

    // Add a hoverable label
    addHoverLabel(label, box);
}

// Function to add a hoverable label to a cube
function addHoverLabel(text, scene) {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.backgroundColor = 'white';
    label.style.padding = '5px';
    label.style.borderRadius = '5px';
    label.style.display = 'none';
    label.style.fontFamily = 'helvetiker, sans-serif';
    label.style.fontSize = '14px';
    label.style.color = '#000000';

    label.innerHTML = text;
    document.body.appendChild(label);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Detect mouse movement
    window.addEventListener('mousemove', function (event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check for intersections with the passed scene
        const intersects = raycaster.intersectObject(scene, true);

        if (intersects.length > 0) {
            label.style.display = 'block';
            label.style.left = event.clientX + 'px';
            label.style.top = event.clientY + 'px';
        } else {
            label.style.display = 'none';
        }
    });
}

// Function to add 3D text labels on the ground
function addGroundLabel(text, positionX, positionY, positionZ, size) {
    const loader = new FontLoader();

    // Load the font
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: size,
            height: 0.1,
            curveSegments: 12,
            bevelEnabled: false
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(positionX, positionY, positionZ);
        textMesh.rotation.x = -Math.PI / 2;

        scene.add(textMesh);
    });
}

// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

// Function to render the scene
function render() {
    renderer.render(scene, camera);
}