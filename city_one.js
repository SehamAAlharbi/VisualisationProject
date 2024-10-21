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

    // Add ambient light to evenly illuminate the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Soft white light
    scene.add(ambientLight);

    // Camera setup
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.y = 10;  // Lift the camera higher to see both cubes and ground clearly
    camera.position.z = 20;

    scene.add(camera);

    // Create a grid helper to show the grid on the ground
    const grid = new THREE.GridHelper(50, 50, 0xffffff, 0xc3c7c7);
    scene.add(grid);

    // Create grounds (districts) with lables, each is smaller than the other, size is width and depth, position is x,z, left ubovae the ground is y
    createGround(20, 20, 0xFFFFFF, 0, 0, 0, 'org.jsoup');  //  white ground
    createGround(10, 10, 0xebe8e8, 0, 0.1, 3, 'nodes');  // grey ground
    createGround(6, 6, 0xebe8e8, -2, 0.1, -6, 'examples');  // smaller grey ground

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;  // Enable shadow map
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Optional, for softer shadows
    document.body.appendChild(renderer.domElement);

    const loader = new KMZLoader();

    // Load cubes (buildings), lable, x, y(lefting), z are for position. scaleZ is for the building's height
    loadCube(loader, 'Attribute', -3, 0.5, 0, 1, 0x78A8B8);  // Cube one
    loadCube(loader, 'Range', 3, 1.5, 3, 3, 0xa7cfcb);  // Cube two
    loadCube(loader, 'Document', 3, 1.5, 6, 3, 0x63392c);  // Cube three
    loadCube(loader, 'DataNode', 0, 2, 0, 4, 0xf7b29c);    // Cube four
    loadCube(loader, 'Node', -1, 1, 3, 2, 0xf5d9c1);   // Cube five
    loadCube(loader, 'HtmlToPlainText', -3, 0.5, -8, 1, 0xf5d9c1);  // Cube six
    loadCube(loader, 'ListLinks', 0, 2, -5, 4, 0x63392c);   // Cube seven

    // Create communication lines between the cubes, start (same building's position, from which), end (to which), height
    createCommunicationLine(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(0, 2, -5), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1.5, 3), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(3, 1.5, 6), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 2, -5), 16, '[Line No:   ][Usage Type:    ]');
    createCommunicationLine(new THREE.Vector3(-1, 1, 3), new THREE.Vector3(-3, 0.5, -8), 16, '[Line No:   ][Usage Type:    ]');


    // Setup camera controls (orbit around the scene)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);  // Render on change
    controls.update();

    window.addEventListener('resize', onWindowResize);  // Resize event listener
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

// Function to load a cube (building) with a hoverable label
function loadCube(loader, label, posX, posY, posZ, scaleZ, color) {
    loader.load('./examples_models_kmz_Box.kmz', function (kmz) {
        kmz.scene.position.set(posX, posY, posZ);
        kmz.scene.scale.z = scaleZ;
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

        // Add a heatmap-like spot under the building (circular plane)
        addHeatmapSpot(posX, posY, posZ);

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

function addHeatmapSpot(posX, posY, posZ) {
    const radius = 1.3;  // Set a constant radius for all heatmap spots
    const geometry = new THREE.CircleGeometry(radius, 32);  // Create a circular geometry

    // Create a gradient texture based on intensity
    const gradientTexture = createGradientTexture();

    // Create a material using the gradient texture
    const material = new THREE.MeshBasicMaterial({
        map: gradientTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,  // Overall opacity of the heatmap spot
    });

    // Create a mesh (heatmap spot) with the geometry and material
    const heatmapSpot = new THREE.Mesh(geometry, material);

    heatmapSpot.rotation.x = -Math.PI / 2;  // Rotate to lay flat on the ground

    // Adjust Y to be above the ground plane
    heatmapSpot.position.set(posX, 0.2, posZ);  // Set Y to 0.2 or higher to clear the ground

    scene.add(heatmapSpot);  // Add the heatmap spot to the scene
}


// Function to create a gradient texture for the heatmap effect
function createGradientTexture() {
    const size = 512;  // Define the texture size
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    // Create a radial gradient (from red -> yellow -> green -> blue)
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    // Define color stops (like your example)
    gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');    // Red (center)
    gradient.addColorStop(0.3, 'rgba(255, 255, 0, 0.8)');  // Yellow (30% mark)
    gradient.addColorStop(0.6, 'rgba(0, 255, 0, 0.6)');  // Green (60% mark)
    gradient.addColorStop(1, 'rgba(0, 0, 255, 0.4)');    // Blue (edge, with transparency for fog effect)

    // Fill the canvas with the gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
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