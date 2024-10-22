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
    const grid = new THREE.GridHelper(50, 50, 0xffffff, 0xc3c7c7);
    scene.add(grid);

    // Create grounds (districts) with lables, each is smaller than the other, size is width and depth, position is x,z, left ubovae the ground is y
    createGround(20, 20, 0xFFFFFF, 0, 0, 0, 'org.jsoup'); 
    createGround(10, 10, 0xebe8e8, 0, 0.1, 3, 'nodes'); 
    createGround(6, 6, 0xebe8e8, -2, 0.1, -6, 'examples');

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
    loadCube(loader, 'HtmlToPlainText', -3, 0.5, -8, 1, 1, 1, 0xf5d9c1);
    loadCube(loader, 'ListLinks', 0, 2, -5, 1, 1, 4, 0x63392c);

    // Create communication lines between the cubes, start (same building's position, from which), end (to which), height
    createCommunicationLine(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(0, 2, -5), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1.5, 3), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1, 0.5), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 2, -5), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(-1, 1, 3), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');


    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    // Render on change
    controls.addEventListener('change', render);  
    controls.update();

    // Resize event listener
    window.addEventListener('resize', onWindowResize);  
}

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


    addGroundLabel(labelText, labelX, labelY, labelZ, 0.28);  // Size is proportional to ground size
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
function addGroundLabel(text, positionX, positionY, positionZ, size, rotationX = 0) {
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

        // Rotate the text to lay flat on the ground
        textMesh.rotation.x = rotationX;

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