import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { KMZLoader } from 'jsm/loaders/KMZLoader.js';
import { FontLoader } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";
// Using D3.js Treemap layout to position (x,y,z) of districts and buildings correctly and dynamically 
import * as d3 from "d3";

let camera, scene, renderer;

// Array of predefined colors
const colors = [0x78A8B8, 0xa7cfcb, 0x63392c, 0xf7b29c, 0xf5d9c1];

// Global object to track reserved areas for each parent ground
const reservedAreas = {};

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x999999);

    // Main directional light (with shadows enabled)
    const light = new THREE.DirectionalLight(0xc3c7c7, 5);
    light.position.set(0.5, 1.0, 0.5).normalize();
    light.castShadow = true;  // Enable shadow casting for the light
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
        { width: 80, depth: 80, label: 'org', index: 0 },
        { width: 50, depth: 50, label: 'org.jsoup', index: 1 },
        { width: 20, depth: 20, label: 'org.jsoup.nodes', index: 2 },
        { width: 30, depth: 30, label: 'org.jsoup.select', index: 3 },
        { width: 20, depth: 20, label: 'org.jsoup.select.test', index: 3 },
        { width: 20, depth: 20, label: 'org.jsoup.safety', index: 4 },
        { width: 20, depth: 20, label: 'org.jsoup.helper', index: 5 },
        { width: 20, depth: 20, label: 'org.jsoup.parser', index: 6 },
        { width: 25, depth: 25, label: 'org.jsoup.examples', index: 7 }

    ];

    const buildings = [
        { label: 'Attribute', scaleX: 1, scaleY: 1, scaleZ: 20, color: getRandomColor(), package: 'org.jsoup.nodes' },
        { label: 'UncheckedIOException', scaleX: 1, scaleY: 1, scaleZ: 10, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'Test', scaleX: 3, scaleY: 3, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'UncheckedIOException', scaleX: 1, scaleY: 1, scaleZ: 10, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'Test', scaleX: 3, scaleY: 3, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'UncheckedIOException', scaleX: 1, scaleY: 1, scaleZ: 10, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'Test', scaleX: 3, scaleY: 3, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup' },
        { label: 'Document', scaleX: 2, scaleY: 2, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.nodes' },
        { label: 'Test', scaleX: 2, scaleY: 2, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.nodes' },
        { label: 'DataNode', scaleX: 1, scaleY: 1, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.select' },
        { label: 'Node', scaleX: 2, scaleY: 2, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup.select.test' },
        { label: 'HtmlToPlainText', scaleX: 1, scaleY: 1, scaleZ: 1, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: 'ListLinks', scaleX: 1, scaleY: 1, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '1', scaleX: 1, scaleY: 2, scaleZ: 2, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '2', scaleX: 2, scaleY: 1, scaleZ: 3, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '3', scaleX: 4, scaleY: 2, scaleZ: 6, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '4', scaleX: 4, scaleY: 5, scaleZ: 4, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '5', scaleX: 3, scaleY: 2, scaleZ: 8, color: getRandomColor(), package: 'org.jsoup.examples' },
        { label: '6', scaleX: 2, scaleY: 2, scaleZ: 10, color: getRandomColor(), package: 'org.jsoup.examples' }
    ];

    // Use treemap from D3.js
    const hierarchyGroundsData = buildPackageHierarchy(grounds);
    const layoutGroundsData = applyTreemapLayout(hierarchyGroundsData);
    centerLayout(layoutGroundsData); // Center the layout

    // Recursively create all grounds in the scene
    createGroundFromTreemap(layoutGroundsData, 0, buildings, scene);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Enable shadow map
    renderer.shadowMap.enabled = true;
    // Optional, for softer shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Create communication lines between the cubes, start (same building's position, from which), end (to which), height
    // createCommunicationLine(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]', 0x78A8B8);
    // createCommunicationLine(new THREE.Vector3(3, 1.5, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0xa7cfcb);
    // createCommunicationLine(new THREE.Vector3(3, 1, 0.5), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0x63392c);
    // createCommunicationLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]', 0xf7b29c);
    // createCommunicationLine(new THREE.Vector3(-1, 1, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0xf5d9c1);


    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    // Render on change
    controls.addEventListener('change', render);
    controls.update();

    // Resize event listener
    window.addEventListener('resize', onWindowResize);
}

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

function buildPackageHierarchy(grounds) {
    const root = { name: 'root', children: [] };  // Root of hierarchy

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
        .sum(d => d.width * d.depth)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([100, 100]) // Fixed layout size for consistent centering
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

        // Step 1: Place child grounds and reserve their spaces
        ground.children.forEach(child => {
            createGroundFromTreemap(child, level + 1, buildings, scene);

            // After placing child grounds, update the reserved area
            const childWidth = child.x1 - child.x0;
            const childDepth = child.y1 - child.y0;

            reservedAreas[ground.data.label].usedX += childWidth + 1; // Add some padding

            // Reset X and move Z down when exceeding parent width
            if (reservedAreas[ground.data.label].usedX + childWidth > x1) {
                reservedAreas[ground.data.label].usedX = x0;
                reservedAreas[ground.data.label].usedZ += childDepth + 1;
            }
        });

        // Step 2: Place parent buildings in the remaining space within the reserved area
        const parentBuildings = buildings.filter(b => b.package === ground.data.label);
        let currentX = reservedAreas[ground.data.label].usedX;
        let currentZ = reservedAreas[ground.data.label].usedZ;
        const buildingPadding = 0.5;

        parentBuildings.forEach(building => {
            const buildingWidth = building.scaleX;
            const buildingDepth = building.scaleZ;

            // Ensure the building is within the reserved area boundaries
            if (currentX + buildingWidth > x1) {
                currentX = x0; // Reset to start of row
                currentZ += buildingDepth + buildingPadding; // Move down for a new row
            }

            // Position the building
            const posX = currentX + buildingWidth / 2;
            const posY = y + 0.5; // Slightly above the ground level
            const posZ = currentZ + buildingDepth / 2;

            createBuilding(new KMZLoader(), building.label, posX, posY, posZ, building.scaleX, building.scaleY, building.scaleZ, building.color);

            // Update current position
            currentX += buildingWidth + buildingPadding;
        });
    } else {
        // Handle leaf grounds without children
        const groundBuildings = buildings.filter(b => b.package === ground.data.label);
        if (groundBuildings.length > 0) {
            const layoutBuildingsData = applyBuildingTreemapLayout(groundBuildings, width, depth);
            layoutBuildingsData.children.forEach(buildingData => {
                createBuildingFromData(buildingData, x, y, z, width, depth, scene);
            });
        }

        if (ground.children) {
            ground.children.forEach(child => createGroundFromTreemap(child, level + 1, buildings, scene));
        }
    }
}


function hasBuildings(ground, buildings) {
    return buildings.some(b => b.package === ground.data.label);
}


function isParent(ground) {
    return Array.isArray(ground.children) && ground.children.length > 0;
}


// Treemap layout function for buildings
function applyBuildingTreemapLayout(buildings, width, depth) {
    const root = d3.hierarchy({ children: buildings })
        .sum(d => d.scaleX * d.scaleZ) // Summing area as the product of width and depth
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
    const labelX = x - 1;  // Center of the ground in the X direction
    const labelZ = z + depth / 2.1;  // Bottom of the ground in the Z direction
    const labelY = y + 0.2;  // Slightly above the ground to avoid clipping

    addGroundLabel(labelText, labelX, labelY, labelZ, 0.8);
}

// Helper function to create a building dynamically positioned within ground bounds
function createBuildingFromData(buildingData, groundX, groundY, groundZ, width, depth, scene) {
    const { x0, y0, x1, y1 } = buildingData;
    const building = buildingData.data;
    const posX = groundX + (x0 + x1) / 2 - width / 2;
    const posZ = groundZ + (y0 + y1) / 2 - depth / 2;
    const posY = groundY + 0.5;

    createBuilding(new KMZLoader(), building.label, posX, posY, posZ, building.scaleX, building.scaleY, building.scaleZ, building.color);
}

// Function to load a cube (building) with a hoverable label, pos is where the building is on the grid, scale is the size of the buidng where y is length, x is width, and z is height
function createBuilding(loader, label, posX, posY, posZ, scaleX, scaleY, scaleZ, color) {
    loader.load('./examples_models_kmz_Box.kmz', function (kmz) {
        kmz.scene.position.set(posX, posY + scaleZ / 2, posZ);
        // So the building stays on the ground surface the scale.z should be doubled the value of posY
        kmz.scene.scale.set(scaleX, scaleY, scaleZ);
        scene.add(kmz.scene);

        kmz.scene.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;  // Enable shadow casting for the cube
                if (child.material) {
                    child.material.color.set(color);  // Set color for the cube
                }
            }
        });

        // Add a hoverable label
        addHoverLabel(label, kmz.scene);

        render();  // Render the scene after cube is added
    });
}

// Function to add a hoverable label to a cube
function addHoverLabel(text, scene) {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.backgroundColor = 'white';
    label.style.padding = '5px';
    label.style.borderRadius = '5px';
    label.style.display = 'none';  // Hidden by default
    label.style.fontFamily = 'helvetiker, sans-serif';
    label.style.fontSize = '14px';  // Adjust size as needed
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
            label.style.display = 'block';  // Show label when hovering
            label.style.left = event.clientX + 'px';
            label.style.top = event.clientY + 'px';
        } else {
            label.style.display = 'none';  // Hide label when not hovering
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
            size: size,  // Size of the text
            height: 0.1, // Thickness of the text
            curveSegments: 12,
            bevelEnabled: false
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });  // Black color for the text
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Position the text on the ground
        textMesh.position.set(positionX, positionY, positionZ);

        // Rotate the text to lay flat on the ground (90 degrees rotation)
        textMesh.rotation.x = -Math.PI / 2;

        scene.add(textMesh);  // Add the text to the scene
    });
}


// Function to create communication lines between cubes
function createCommunicationLine(start, end, curveHeight, label, color) {
    // Define the control points for the curve (start, middle, and end)
    const middlePoint = new THREE.Vector3(
        (start.x + end.x) / 2,  // Midpoint of x
        Math.max(start.y, end.y) + curveHeight,  // Control height for the curve
        (start.z + end.z) / 2   // Midpoint of z
    );

    // Create a curve from the start point, through the middle, to the end point
    const curve = new THREE.CatmullRomCurve3([start, middlePoint, end]);

    // Create a tube geometry to represent the curve
    const tubeGeometry = new THREE.TubeGeometry(curve, 200, 0.1, 5, false);

    // Material for the line (yellow color)
    const tubeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,  // Enable transparency
        opacity: 0.6        // Set opacity to make it softer and more transparent
    });

    // Create a mesh from the tube geometry and material
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

    // add a hovering label 
    addHoverLabel(label, tube);

    // Add the tube to the scene
    scene.add(tube);
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