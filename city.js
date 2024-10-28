import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { KMZLoader } from 'jsm/loaders/KMZLoader.js';
import { FontLoader } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";
// Using D3.js Treemap layout to position (x,y,z) of districts and buildings correctly and dynamically 
import * as d3 from "d3";

let camera, scene, renderer;

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
        { width: 30, depth: 30, label: 'org.jsoup.nodes', index: 2 },
        { width: 5, depth: 5, label: 'org.jsoup.select', index: 3 },
        { width: 10, depth: 10, label: 'org.jsoup.safety', index: 4 },
        { width: 5, depth: 5, label: 'org.jsoup.helper', index: 5 }

    ];

    // createGround(100, 100, 0xFFFFFF, 0, 10, 0, 'Seham');

    // Use treemap from D3.js
    const hierarchyData = buildPackageHierarchy(grounds);
    const layoutData = applyTreemapLayout(hierarchyData);
    centerLayout(layoutData); // Center the layout

    // Recursively create all grounds in the scene
    createAllGroundsFromLayout(layoutData, scene);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Enable shadow map
    renderer.shadowMap.enabled = true;
    // Optional, for softer shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const loader = new KMZLoader();

    // Load cubes (buildings), lable, x, y(lefting), z are for position. scaleZ is for the building's height which should be the double of posY
    createBuilding(loader, 'Attribute', -3, 0.5, 0, 1, 1, 1, 0x78A8B8);
    createBuilding(loader, 'Range', 3, 1.5, 3, 3, 3, 3, 0xa7cfcb);
    createBuilding(loader, 'Document', 3, 1, 0.5, 1, 1, 1, 0x63392c);
    createBuilding(loader, 'DataNode', 0, 2, 0, 1, 1, 4, 0xf7b29c);
    createBuilding(loader, 'Node', -1, 1, 3, 2, 2, 2, 0xf5d9c1);
    createBuilding(loader, 'HtmlToPlainText', -3, 0.5, -15, 1, 1, 1, 0xf5d9c1);
    createBuilding(loader, 'ListLinks', -10, 2, -15, 1, 1, 4, 0x63392c);

    // Create communication lines between the cubes, start (same building's position, from which), end (to which), height
    createCommunicationLine(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]', 0x78A8B8);
    createCommunicationLine(new THREE.Vector3(3, 1.5, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0xa7cfcb);
    createCommunicationLine(new THREE.Vector3(3, 1, 0.5), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0x63392c);
    createCommunicationLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]', 0xf7b29c);
    createCommunicationLine(new THREE.Vector3(-1, 1, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]', 0xf5d9c1);


    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    // Render on change
    controls.addEventListener('change', render);
    controls.update();

    // Resize event listener
    window.addEventListener('resize', onWindowResize);
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

// Recursive function to create all grounds based on layout
function createAllGroundsFromLayout(node, scene) {
    createGroundFromTreemap(node, 0, scene);
}

// Recursive function to position and render grounds based on treemap data
function createGroundFromTreemap(node, level, scene) {
    const { x0, y0, x1, y1 } = node;
    const width = x1 - x0;
    const depth = y1 - y0;
    const x = x0 + width / 2;
    const z = y0 + depth / 2;
    const y = level * 0.4;  // Elevate each level slightly

    // Calculate the shade of grey based on the level (0 = white, higher levels get progressively darker)
    const lightness = Math.max(100 - level * 15, 0);  // Decrease lightness by 15% per level, but not below 0
    const color = new THREE.Color(`hsl(0, 0%, ${lightness}%)`);

    // Create the ground with the calculated grey color
    const label = node.data?.label || "";
    console.log(label);
    createGround(width, depth, color, x, y, z, label);

    // Recur for each child without using parent's x and z positions
    if (node.children) {
        node.children.forEach(child => createGroundFromTreemap(child, level + 1, scene));
    }
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

// Function to load a cube (building) with a hoverable label, pos is where the building is on the grid, scale is the size of the buidng where y is length, x is width, and z is height
function createBuilding(loader, label, posX, posY, posZ, scaleX, scaleY, scaleZ, color) {
    loader.load('./examples_models_kmz_Box.kmz', function (kmz) {
        kmz.scene.position.set(posX, posY, posZ);
        kmz.scene.scale.z = scaleZ;
        kmz.scene.scale.x = scaleX;
        kmz.scene.scale.y = scaleY;
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