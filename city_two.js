import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { KMZLoader } from 'jsm/loaders/KMZLoader.js';
import { FontLoader } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";

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
        { width: 200, depth: 200, label: 'org',  index: 0 },
        { width: 150, depth: 150, label: 'org.jsoup',  index: 1 },
        { width: 30, depth: 30, label: 'org.jsoup.nodes', index: 2 },
        { width: 20, depth: 20, label: 'org.jsoup.nodes.x', index: 2 },
        { width: 50, depth: 50, label: 'org.jsoup.examples', index: 3 },
        { width: 20, depth: 20, label: 'org.jsoup.examples.x', index: 3 },
        { width: 10, depth: 10, label: 'org.jsoup.examples.x.y', index: 3 }
        // { width: 5, depth: 5, label: 'org.jsoup.examples.1', isRoot: false, index: 3 },
        // { width: 5, depth: 5, label: 'org.jsoup.examples.2', isRoot: false, index: 4 },
        // { width: 5, depth: 5, label: 'org.jsoup.nodes.3', isRoot: false, index: 5 },
        // { width: 5, depth: 5, label: 'org.jsoup.nodes.4', isRoot: false, index: 6 }
    ];

    // creating grounds dynamiclly 
    createAllGrounds(grounds);

    // Create grounds (districts) with lables, each is smaller than the other, size is width and depth, position is x,z, left ubovae the ground is y
    // createGround(80, 80, 0xFFFFFF, 0, 0, 0, 'org.jsoup'); 
    // createGround(40, 40, 0xebe8e8, -10, 0.1, 15, 'nodes'); 
    // createGround(20, 20, 0xebe8e8, -10, 0.1, -20, 'examples');

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
    loadCube(loader, 'Attribute', -3, 0.5, 0, 1, 1, 1, 0x78A8B8);
    loadCube(loader, 'Range', 3, 1.5, 3, 3, 3, 3, 0xa7cfcb);
    loadCube(loader, 'Document', 3, 1, 0.5, 1, 1, 1, 0x63392c);
    loadCube(loader, 'DataNode', 0, 2, 0, 1, 1, 4, 0xf7b29c);
    loadCube(loader, 'Node', -1, 1, 3, 2, 2, 2, 0xf5d9c1);
    loadCube(loader, 'HtmlToPlainText', -3, 0.5, -15, 1, 1, 1, 0xf5d9c1);
    loadCube(loader, 'ListLinks', -10, 2, -15, 1, 1, 4, 0x63392c);

    // Create communication lines between the cubes, start (same building's position, from which), end (to which), height
    createCommunicationLine(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1.5, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1, 0.5), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(-10, 2, -15), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(-1, 1, 3), new THREE.Vector3(-3, 0.5, -15), 16, '[Line No:   ][Usage Type:    ]');


    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    // Render on change
    controls.addEventListener('change', render);
    controls.update();

    // Resize event listener
    window.addEventListener('resize', onWindowResize);
}

function getPackageHierarchy(grounds) {
    const packageHierarchy = {};

    grounds.forEach(ground => {
        const parentPackage = ground.label.split('.').slice(0, -1).join('.');
        if (!packageHierarchy[parentPackage]) {
            packageHierarchy[parentPackage] = [];
        }
        packageHierarchy[parentPackage].push(ground);
    });

    return packageHierarchy;
}

function createAllGrounds(grounds) {
    // Get the hierarchy of packages based on names
    const packageHierarchy = getPackageHierarchy(grounds);

    // Find the root package (the one without any parent)
    let rootGround = grounds.find(ground => !ground.label.includes('.'));
    
    // Create the root package (main package)
    createGround(rootGround.width, rootGround.depth, 0xFFFFFF, 0, 0, 0, rootGround.label);

    // Start placing the sub-packages
    placePackages(rootGround, packageHierarchy, 0.1);
}

function placePackages(parentGround, packageHierarchy, yOffset) {
    const subPackages = packageHierarchy[parentGround.label] || [];
    let xOffset = -parentGround.width / 2 + 20; // Initial X offset for sub-packages
    let zOffset = -parentGround.depth / 2 + 20; // Initial Z offset for sub-packages
    let rowMaxHeight = 0;

    subPackages.forEach(subGround => {
        // Always lift sub-packages, even if they have no further children
        yOffset += 0.1;  // Lift the sub-package above the parent

        createGround(subGround.width, subGround.depth, 0xebe8e8, 0, yOffset, 0, subGround.label);

        // Recursively place child packages if any exist
        if (packageHierarchy[subGround.label]) {
            placePackages(subGround, packageHierarchy, yOffset);  // Stack child packages
        }
    });
}




// function createAllGrounds(grounds) {
//     let rootGround = grounds.find(ground => ground.isRoot);

//     // Position the root ground at (0, 0, 0)
//     let rootWidth = rootGround.width;
//     let rootDepth = rootGround.depth;

//     // Create the root ground at the origin
//     createGround(rootWidth, rootDepth, 0xFFFFFF, 0, 0, 0, rootGround.label);

//     let yOffset = 0.1;  // Slightly above the root ground
//     let padding = 20;    // Space between grounds to avoid overlap

//     // Define initial X and Z for placing non-root grounds
//     let nextX = -rootWidth / 2 + padding; // Start at the left boundary with padding
//     let nextZ = -rootDepth / 2 + padding; // Start near the back boundary with padding
//     let maxRowHeight = 0;  // Keep track of the tallest item in the current row to move to the next row properly

//     // Place non-root grounds dynamically on top of the root ground, avoiding overlap
//     grounds.forEach(ground => {
//         if (!ground.isRoot) {
//             // Check if the ground would go beyond the root ground's width
//             if (nextX + ground.width + padding > rootWidth / 2) {
//                 // Move to the next row
//                 nextX = -rootWidth / 2 + padding;
//                 nextZ += maxRowHeight + padding;  // Move down by the height of the largest item in the row
//                 maxRowHeight = 0;  // Reset for the new row
//             }

//             // Place the non-root ground
//             createGround(ground.width, ground.depth, 0xebe8e8, nextX, yOffset, nextZ, ground.label);

//             // Update the max row height if the current ground is taller
//             if (ground.depth > maxRowHeight) {
//                 maxRowHeight = ground.depth;
//             }

//             // Update the X position for the next ground
//             nextX += ground.width + padding;
//         }
//     });
// }
// Function to create a ground (district) and add a label
function createGround(width, depth, color, x, y, z, labelText) {
    const groundGeometry = new THREE.BoxGeometry(width, 0.15, depth);
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
function loadCube(loader, label, posX, posY, posZ, scaleX, scaleY, scaleZ, color) {
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
function createCommunicationLine(start, end, curveHeight, label) {
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
        color: 0xffffff,
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