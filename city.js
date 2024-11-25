import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { FontLoader } from "jsm/loaders/FontLoader.js";
import { TextGeometry } from "jsm/geometries/TextGeometry.js";

// Using D3.js Treemap layout to position (x,y,z) of districts and buildings correctly and dynamically without overlapping
import * as d3 from "d3";

let camera, scene, renderer;

const colors = [0x78A8B8, 0xa7cfcb, 0x63392c, 0xf7b29c, 0xf5d9c1];

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
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
    // Lift the camera higher to see both cubes and ground clearly
    camera.position.y = 10;
    camera.position.z = 20;

    scene.add(camera);

    // Create a grid helper to show the grid on the ground
    const grid = new THREE.GridHelper(100, 100, 0xffffff, 0xc3c7c7);
    scene.add(grid);

    // Grounds width and depth are set to 0 for now, the function calculateGroundSizes will determine them dynamically based on their buildings and chaild ground sizes.
   // Grounds array
const grounds = [
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.examples' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.helper' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.1' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.2' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.3' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.4' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.nodes' },
    { scaleX: 0.0, scaleZ: 0.0, label: 'org.jsoup.nodes.1' }
];

// Buildings array
const buildings = [
    { label: 'HtmlToPlainText', scaleX: 2.0, scaleY: 0.5, scaleZ: 2.0, color: getColorForScaleY(0.5), package: 'org.jsoup.examples', connections: [], lineText: [] },
    { label: 'Wikipedia', scaleX: 2.0, scaleY: 1.0, scaleZ: 2.0, color: getColorForScaleY(1), package: 'org.jsoup.examples', connections: [], lineText: [] },
    { label: 'MyOwnExample', scaleX: 2.0, scaleY: 10.0, scaleZ: 2.0, color: getColorForScaleY(10), package: 'org.jsoup.examples', connections: [], lineText: [] },
    { label: 'ListLinks', scaleX: 2.0, scaleY: 3.0, scaleZ: 2.0, color: getColorForScaleY(3), package: 'org.jsoup.examples', connections: [], lineText: [] },

    // org.jsoup buildings
    { label: 'Method', scaleX: 10.0, scaleY: 10.0, scaleZ: 10.0, color: getColorForScaleY(100), package: 'org.jsoup', connections: ['MyOwnExample'], lineText: ['READ: Line 55', 'REFERENCE: Line 43', 'REFERENCE: Line 45', 'REFERENCE: Line 43', 'REFERENCE: Line 45'] },
   

    { label: 'DocumentType_1', scaleX: 10.0, scaleY: 1.0, scaleZ: 10.0, color: getColorForScaleY(1), package: 'org.jsoup.nodes', connections: [], lineText: [] },
    { label: 'DocumentType_2', scaleX: 10.0, scaleY: 80, scaleZ: 10.0, color: getColorForScaleY(80), package: 'org.jsoup.nodes', connections: [], lineText: [] },

    // org.jsoup.helper buildings
    { label: 'DataUtil', scaleX: 5.0, scaleY: 50.0, scaleZ: 5.0, color: getColorForScaleY(50), package: 'org.jsoup.helper', connections: [], lineText: [] }
];



    console.log("grounds:", grounds);  // Check if grounds is defined and an array
    console.log("buildings:", buildings);

    // determine ground size
    // Example usage before applying treemap layout
    calculateGroundSizes(grounds, buildings);



    // Use treemap from D3.js
    const hierarchyGroundsData = buildPackageHierarchy(grounds);
    const layoutGroundsData = applyTreemapLayout(hierarchyGroundsData, grounds);
    centerLayout(layoutGroundsData);

    // Recursively create all grounds in the scene
    createGroundFromTreemap(layoutGroundsData, 0, buildings, scene);

    // Create connections lines between the buildings
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
    gui.add(settings, 'hideCommunicationLines').name('Hide Connections Lines').onChange(toggleCommunicationLines);

    render();

}

// dynamic calculation to calculate ground sizes based on building sizes and child grounds
function calculateGroundSizes(grounds, buildings) {
    // Create a map for quick access to buildings based on their package/ground label
    const buildingsByGround = buildings.reduce((map, building) => {
        if (!map[building.package]) map[building.package] = [];
        map[building.package].push(building);
        return map;
    }, {});

    // Define a minimum size for visibility, adjust as needed
    const minSize = 2.0;

    // Recursive function to calculate area requirements for grounds and their children
    function calculateAreaForGround(ground) {
        let area = 0;

        // Add area for buildings directly associated with this ground
        const groundBuildings = buildingsByGround[ground.label] || [];
        groundBuildings.forEach(building => {
            area += building.scaleX * building.scaleZ;
        });

        // If the ground has child grounds, recursively add their areas
        if (ground.children) {
            ground.children.forEach(child => {
                const childArea = calculateAreaForGround(child);
                area += childArea;
            });
        }

        // Set scaleX and scaleZ based on the calculated area
        // Use Math.max to ensure a minimum size for visibility
        ground.scaleX = Math.max(Math.sqrt(area), minSize);
        ground.scaleZ = Math.max(Math.sqrt(area), minSize);

        return area;
    }

    // Calculate area and sizes for each top-level ground
    grounds.forEach(ground => calculateAreaForGround(ground));
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


function getColorForScaleY(scaleY) {
    if (scaleY === 0.5) {
        return 0xD5533F; // Red
    } else if (scaleY >= 1 && scaleY <= 100) {
        const shadesOfGreen = [
            0xE6FDDA, // Light green
            0x9FCC87, 
            0x699452, 
            0x4C7636, 
            0x396025, 
            0x223F13  // Deep green
        ];
        // Map scaleY (1-100) to shadesOfGreen (6 groups)
        const groupIndex = Math.min(Math.floor((scaleY - 1) / (100 / shadesOfGreen.length)), shadesOfGreen.length - 1);
        return shadesOfGreen[groupIndex];
    }
    return 0x999999; // Default gray
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

// Apply D3 treemap layout to assign positions within parent bounds.
// Each entry in the grounds array includes scaleX and scaleZ values, which act as relative weights for the layout sizing. These values indirectly impact how much space each ground occupies in the final layout, as D3's treemap algorithm will consider them when calculating the area for each ground.
function applyTreemapLayout(rootNode, grounds) {
    // Calculate total area needed based on grounds' scaleX and scaleZ
    const totalArea = grounds.reduce((sum, ground) => sum + ground.scaleX * ground.scaleZ, 0);

    // Set a scaling factor to determine compactness; adjust as needed
    const scalingFactor = 1;

    // Calculate the side length of the layout area dynamically
    const sideLength = Math.sqrt(totalArea) * scalingFactor;

    // Define minimum and maximum layout size to keep visual consistency
    const minSize = 100;  // minimum side length
    const maxSize = 300;  // maximum side length

    // Ensure the side length stays within the min and max size range
    const layoutSize = Math.max(minSize, Math.min(maxSize, sideLength));

    // Create a D3 treemap layout with dynamic size
    const root = d3.hierarchy(rootNode)
        .sum(d => d.scaleX * d.scaleZ)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([layoutSize, layoutSize])  
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
    const { x0, y0, x1, y1 } = ground; // Boundaries of the ground
    const width = x1 - x0;
    const depth = y1 - y0;
    const centerX = x0 + width / 2;
    const centerZ = y0 + depth / 2;
    const y = level * 0.4; // Height layer for the ground

    // Create the ground (visual representation)
    const lightness = Math.max(100 - level * 15, 0); // Adjust lightness for each level
    const color = new THREE.Color(`hsl(0, 0%, ${lightness}%)`);
    const label = ground.data?.label ? ground.data.label.split('.').pop() : "";

    createGround(width, depth, color, centerX, y, centerZ, label);

    // Filter buildings for this ground
    const parentBuildings = buildings.filter(b => b.package === ground.data.label);

    // Track the area occupied by child grounds
    let occupiedArea = [];

    // Handle child grounds recursively
    if (ground.children && ground.children.length > 0) {
        ground.children.forEach(child => {
            createGroundFromTreemap(child, level + 1, buildings, scene);

            // Add the child ground's occupied area to the tracker
            occupiedArea.push({
                x0: child.x0,
                x1: child.x1,
                y0: child.y0,
                y1: child.y1
            });
        });
    }

    // Add a small padding between buildings
    const buildingPadding = 0.5; // Increase this value to increase spacing

    // Place parent buildings in the remaining unoccupied space
    if (parentBuildings.length > 0) {
        let currentX = x0; // Start at the left edge of the ground
        let currentZ = y0; // Start at the top edge of the ground

        parentBuildings.forEach(building => {
            const buildingWidth = building.scaleX + buildingPadding; 
            const buildingDepth = building.scaleZ + buildingPadding;

            // Check for overlap with occupied child areas
            while (true) {
                const overlaps = occupiedArea.some(area => {
                    return (
                        currentX < area.x1 &&
                        currentX + buildingWidth > area.x0 &&
                        currentZ < area.y1 &&
                        currentZ + buildingDepth > area.y0
                    );
                });

                // If there's an overlap, move the building to the right or down
                if (overlaps) {
                    currentX += buildingWidth; // Move to the right
                    if (currentX + buildingWidth > x1) {
                        currentX = x0; // Reset to the left
                        currentZ += buildingDepth; // Move down
                    }
                } else {
                    // No overlap, position is valid
                    break;
                }
            }

            // Ensure buildings do not exceed the parent ground's boundaries
            if (currentX + buildingWidth > x1 || currentZ + buildingDepth > y1) {
                console.warn(`Building ${building.label} cannot be placed: insufficient space in ground ${ground.data.label}`);
                return;
            }

            // Calculate the building's position
            const posX = currentX + buildingWidth / 2 - buildingPadding / 2; // Adjust for padding
            const posY = y + 0.5; // Slightly above ground level
            const posZ = currentZ + buildingDepth / 2 - buildingPadding / 2; // Adjust for padding

            // Create the building
            createBuilding(building.label, posX, posY, posZ, building.scaleX, building.scaleY, building.scaleZ, building.color);

            // Save the building position globally
            buildingPositionArray.push({
                label: building.label,
                package: building.package,
                position: { x: posX, y: posY, z: posZ },
                connections: building.connections || [],
                lineText: building.lineText || [],
                color: building.color
            });

            // Update position for the next building
            currentX += buildingWidth; // Include padding in position update
            if (currentX + buildingWidth > x1) {
                currentX = x0; // Reset to the left
                currentZ += buildingDepth; // Move down
            }
        });
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
    const labelX = x - 1;
    const labelZ = z + depth / 2.1;
    const labelY = y + 0.2;

    addGroundLabel(labelText, labelX, labelY, labelZ, 1.5);
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