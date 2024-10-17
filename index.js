import * as THREE from "three";
// the following Three.js add-on allows us to move and see around the objects we have, the word "OrbitControls" is defined by you
import {OrbitControls} from "jsm/controls/OrbitControls.js";


// set the size of the renderer 
const w = window.innerWidth;
const h = window.innerHeight;
// the value passed makes it looks better
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);

// documnt is the html page, domelement is the canavs element
document.body.appendChild(renderer.domElement);



// work on the camera
// fov 75 will be very braod, 45 is very close
const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 10;
// passed arguments is related to the objects that will be visiable to the camera
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
// scoot the camera back a little bit further away so we can see
camera.position.z = 2;

// work on the scene
const scene = new THREE.Scene();

// define the OrbitContrls, so we can move and see around, zoom in and out the objects/shpes we have on the scane, add the camera and renderer to it.
const controls = new OrbitControls(camera, renderer.domElement);





// let's add some objects, Three.js has some built-in geometrics that we can gap and throw in here, 1.0 is the size and the 2 is the detail level, if the shape has details like sides, etc
// This line creates a geometry for the mesh
const geo = new THREE.IcosahedronGeometry(1.0, 2);
// line creates a material for the mesh using, basic metrial in here, just color
// const mat = new THREE.MeshBasicMaterial({ color: 0xccff });

// make the shape more intersting by using matrials that interacts to light, flatshding allwos you to see all the faces (makes it 3D)
const mat = new THREE.MeshStandardMaterial({color: 0xffffff, flatShading: true })

// This line creates the mesh (container), which is the combination of the geometry (geo) and the material (mat). A mesh in Three.js is essentially a 3D object made up of both the shape (geometry) and the appearance (material). In this case, the mesh will be an icosahedron with the given color.
// mesh has many properies, so you can rotate it, move it around, anamite it.
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

// add a wire mesh (the white lines on the shape are actully another mesh but added on top of the original object/gemo)
const wireMat = new THREE.MeshBasicMaterial({color:0xffffff, wireframe: true});

// the new mesh that I will add to the scne with its own wire material and using the same object/gemo above
const wireMesh = new THREE.Mesh(geo, wireMat);
// to make it less flikery
wireMesh.scale.setScalar(1.001);
// add the new wire mesh to the old mesh so they are attached togther, applying animation on the original one will also be applied to teh wire mesh now as they are attached.
mesh.add(wireMesh);

// add light to the scane so the obkect can iteract with it, blue on the top, orange on the buttom
const hemLight = new THREE.HemisphereLight(0x0099ff, 0xaa5500);
scene.add(hemLight);

// to add anaimation to the mesh, 
function animate(t = 0) {
    requestAnimationFrame(animate);
    // rotate/animate the by itself object by rotating its container, it will move with the line below
    // mesh.rotation.y = t * 0.0001;
    // pass/render something so you can see on teh screen
    renderer.render(scene, camera);
}

animate();
