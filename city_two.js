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
        { width: 100, depth: 100, label: 'org', index: 0 },
        { width: 60, depth: 60, label: 'org.jsoup', index: 1 },
        { width: 5, depth: 5, label: 'org.jsoup.nodes', index: 2 },
        { width: 5, depth: 5, label: 'org.jsoup.select', index: 3 },
        { width: 5, depth: 5, label: 'org.jsoup.safety', index: 4 },
        { width: 5, depth: 5, label: 'org.jsoup.helper', index: 5 }

    ];


    // use with D3.js
    const hierarchyData = buildPackageHierarchy(grounds);
    const layoutData = applyTreemapLayout(hierarchyData);
    // Create grounds in the scene
    layoutData.children.forEach(child => createGroundFromTreemap(child, 0, 0, 0, scene));



    // creating grounds dynamiclly 
    // createAllGrounds(grounds);

    // const padding = 4;
    // const groundSize = 40;
    // const effectiveSize = 100 - 2 * padding;
    // const cellSize = effectiveSize / 2; // Size for each "cell" in the grid

    // createGround(100, 100, 0xFFFFFF, 0, 0, 0, 'parent'); // Parent centered at (0, 0, 0)

    // // Positions for each cell with padding accounted for
    // createGround(groundSize, groundSize, 0xebe8e8, -50 + padding + cellSize / 2, 0.1, 50 - padding - cellSize / 2, 'child1'); // Top-left
    // createGround(groundSize, groundSize, 0xebe8e8, -50 + padding + 1.5 * cellSize, 0.1, 50 - padding - cellSize / 2, 'child2'); // Top-right
    // createGround(groundSize, groundSize, 0xebe8e8, -50 + padding + cellSize / 2, 0.1, 50 - padding - 1.5 * cellSize, 'child3'); // Bottom-left
    // createGround(groundSize, groundSize, 0xebe8e8, -50 + padding + 1.5 * cellSize, 0.1, 50 - padding - 1.5 * cellSize, 'child4'); // Bottom-right


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

  // [Correct function] Function to build a deeply nested hierarchy with "children" property
//   function buildPackageHierarchy(grounds) {
//     const root = {}; // Initialize an empty root

//     grounds.forEach(ground => {
//         const parts = ground.label.split('.'); // Split label into parts
//         let currentLevel = root;

//         parts.forEach((part, index) => {
//             // Check if this part exists at the current level
//             if (!currentLevel[part]) {
//                 // If it's the last part, add ground data; otherwise, initialize "children"
//                 currentLevel[part] = index === parts.length - 1 
//                     ? { ...ground, children: {} }  // Leaf nodes have ground data and empty children
//                     : { children: {} };  // Non-leaf nodes have only children property
//             }

//             // Move down to the next level in "children"
//             currentLevel = currentLevel[part].children;
//         });
//     });

//     return root;
// }


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
        .size([rootNode.width || 100, rootNode.depth || 100])
        .padding(1)
        .round(true)(root);

    return root;
}

    // Recursive function to position and render grounds based on treemap data
  // Recursive function to position and render grounds based on treemap data
function createGroundFromTreemap(node, parentX = 0, parentZ = 0, level = 0, scene) {
    const { x0, y0, x1, y1 } = node;
    const width = x1 - x0;
    const depth = y1 - y0;
    const x = parentX + x0 + width / 2;
    const z = parentZ + y0 + depth / 2;
    const y = level * 0.4;  // Elevate each level

    // Generate color based on level
    const color = new THREE.Color(`hsl(${(level * 60) % 360}, 70%, 50%)`);

    // This is where createGround is used to render each ground
    createGround(width, depth, color, x, y, z, node.data.label, scene);

    if (node.children) {
        node.children.forEach(child => createGroundFromTreemap(child, x - width / 2, z - depth / 2, level + 1, scene));
    }
}


function createAllGrounds(grounds) {
    // Get the hierarchy of packages based on names
    const packageHierarchy = buildPackageHierarchy(grounds);

    // Find the root package (the one without any parent, no . is in it)
    let rootGround = grounds.find(ground => !ground.label.includes('.'));

    // Create the root package (main package) at 
    createGround(rootGround.width, rootGround.depth, 0xFFFFFF, 0, 0, 0, rootGround.label);

    // Start placing the sub-packages
    placePackages(rootGround, packageHierarchy, 0.1);
}

function placePackages(parentGround, packageHierarchy, yOffset) {
    const subGrounds = packageHierarchy[parentGround.label] || [];
    const padding = 5;  // Reduced padding for more compact layout

    // Calculate initial position inside the parent ground
    let nextX = -parentGround.width / 2 + padding;
    let nextZ = -parentGround.depth / 2 + padding;  // Start from bottom-left inside the parent

    subGrounds.forEach(subGround => {
        // Check if we overflow parent's width, adjust position for new row if needed
        if (nextX + subGround.width + padding > parentGround.width / 2) {
            // Move to the next row
            nextX = -parentGround.width / 2 + padding;
            nextZ += subGround.depth + padding;
        }

        // Place the sub-ground
        createGround(subGround.width, subGround.depth, 0xebe8e8, nextX, yOffset, nextZ, subGround.label);

        // Move to the next sub-ground position
        nextX += subGround.width + padding;

        // Recursively handle the child elements
        if (packageHierarchy[subGround.label]) {
            // Increase yOffset for stacking higher as we go deeper into the hierarchy
            placePackages(subGround, packageHierarchy, yOffset + 0.1);
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
//     let padding = 25;    // Space between grounds to avoid overlap

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