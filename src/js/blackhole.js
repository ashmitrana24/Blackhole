import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class BlackHoleVisualization {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#blackhole-canvas'),
            antialias: true
        });
        
        this.init();
        this.setupControls();
        this.setupEventListeners();
        this.createBlackHole();
        this.animate();
        
        this.scrollProgress = 0;
        this.setupScrollAnimation();
        this.setupDynamicLabels();
        this.setupCardInteractions();
        this.isAnimating = false;
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.camera.position.set(0, 3, 10);
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
        
        // Create star background
        this.createStarfield();
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 20;
        this.controls.minDistance = 2;
    }

    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = (Math.random() - 0.5) * 2000;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            transparent: true
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    createBlackHole() {
        // Event Horizon with gravitational lensing
        const eventHorizonGeometry = new THREE.SphereGeometry(1, 128, 128);
        const eventHorizonMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                cameraPos: { value: this.camera.position }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 cameraPos;
                uniform float time;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                #define PI 3.14159265359
                
                // Schwarzschild radius
                float Rs = 1.0;
                
                vec3 rayDirection(vec3 pos) {
                    return normalize(pos - cameraPos);
                }
                
                float schwarzschildMetric(float r) {
                    return 1.0 - Rs / max(r, Rs + 0.001);
                }
                
                vec3 deflectLight(vec3 pos, vec3 dir) {
                    vec3 nPos = normalize(pos);
                    float r = length(pos);
                    float metric = schwarzschildMetric(r);
                    
                    // Calculate gravitational lensing
                    float bendingStrength = 2.0 * Rs / (r * r);
                    vec3 tangent = normalize(cross(nPos, dir));
                    
                    // Apply bending
                    return normalize(mix(dir, tangent, bendingStrength * metric));
                }
                
                void main() {
                    vec3 viewDir = rayDirection(vPosition);
                    vec3 normal = normalize(vNormal);
                    
                    // Calculate distortion
                    vec3 bentRay = deflectLight(vPosition, viewDir);
                    float distortion = dot(bentRay, normal);
                    
                    // Create the black hole effect
                    float r = length(vPosition);
                    float eventHorizon = smoothstep(Rs, Rs + 0.1, r);
                    float rim = pow(1.0 - abs(distortion), 4.0);
                    
                    // Add some blue-ish glow near the event horizon
                    vec3 glowColor = mix(
                        vec3(0.2, 0.6, 1.0),  // Even brighter and more saturated blue glow
                        vec3(0.0),             // Black hole
                        smoothstep(Rs, Rs + 0.5, r)
                    );
                    
                    // Final color with increased opacity
                    vec3 color = glowColor * rim * eventHorizon;
                    float alpha = rim * eventHorizon * 2.5; // Increased from 2.0 to 2.5
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
        this.scene.add(this.eventHorizon);

        // Create the lensing effect sphere with increased opacity
        const lensingGeometry = new THREE.SphereGeometry(4, 128, 128);
        const lensingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                cameraPos: { value: this.camera.position }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 cameraPos;
                uniform float time;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                float distortionStrength(vec3 pos) {
                    float dist = length(pos);
                    return 2.5 / (dist * dist); // Increased from 2.0 to 2.5
                }
                
                void main() {
                    vec3 viewDir = normalize(vPosition - cameraPos);
                    float distortion = distortionStrength(vPosition);
                    
                    // Create warping effect with increased intensity
                    float warp = pow(1.0 - abs(dot(viewDir, vNormal)), 1.1); // Reduced from 1.3 to 1.1 for even stronger effect
                    warp *= distortion;
                    
                    // Add some subtle color variation with increased opacity
                    vec3 color = mix(
                        vec3(0.2, 0.5, 0.9),  // More intense blue tint
                        vec3(0.0),             // Clear
                        warp
                    );
                    
                    // Increased opacity multiplier from 0.7 to 0.9
                    gl_FragColor = vec4(color, warp * 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.lensingEffect = new THREE.Mesh(lensingGeometry, lensingMaterial);
        this.scene.add(this.lensingEffect);

        // Accretion Disk
        const diskGeometry = new THREE.RingGeometry(2, 8, 128, 64);
        const diskMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                vec3 colorTemperature(float temp) {
                    vec3 hotColor = vec3(0.2, 0.4, 1.0);  // Blue for hotter regions
                    vec3 coolColor = vec3(1.0, 0.3, 0.1); // Red-orange for cooler regions
                    return mix(coolColor, hotColor, temp);
                }
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                void main() {
                    float dist = length(vPosition);
                    float angle = atan(vPosition.y, vPosition.x);
                    
                    // Doppler effect
                    float velocity = 0.5 / dist;
                    float doppler = 0.5 + 0.5 * cos(angle - time * velocity);
                    
                    // Temperature variation
                    float temp = smoothstep(2.0, 8.0, dist);
                    vec3 baseColor = colorTemperature(temp);
                    
                    // Apply doppler shift
                    baseColor *= mix(0.5, 1.5, doppler);
                    
                    // Add turbulence
                    float turbulence = random(vec2(angle * 5.0 + time, dist * 2.0));
                    baseColor += turbulence * 0.1;
                    
                    // Intensity falloff
                    float intensity = smoothstep(8.0, 2.0, dist) * (1.0 - abs(vUv.y));
                    intensity *= (1.0 + turbulence * 0.5);
                    
                    gl_FragColor = vec4(baseColor, intensity * 0.8);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        this.accretionDisk.rotation.x = Math.PI / 3;
        this.scene.add(this.accretionDisk);
    }

    createVolumetricRays() {
        const rayGeometry = new THREE.CylinderGeometry(0.1, 3, 10, 32, 1, true);
        const rayMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    float intensity = pow(1.0 - vUv.y, 2.0) * 0.2;
                    intensity *= (0.5 + 0.5 * sin(vUv.x * 20.0 + time));
                    vec3 color = vec3(1.0, 0.7, 0.3);
                    gl_FragColor = vec4(color, intensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const rays = new THREE.Group();
        for(let i = 0; i < 8; i++) {
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.rotation.z = (i / 8) * Math.PI * 2;
            ray.position.z = -5;
            rays.add(ray);
        }
        this.rays = rays;
        this.scene.add(rays);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // UI Controls
        document.getElementById('info-toggle').addEventListener('click', () => {
            const panel = document.getElementById('info-panel');
            panel.classList.toggle('translate-x-full');
        });

        document.getElementById('fullscreen-toggle').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Remove loading screen after initialization
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }, 1500);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const time = performance.now() * 0.001;
        
        // Update uniforms for lensing effects
        if (this.eventHorizon) {
            this.eventHorizon.material.uniforms.time.value = time;
            this.eventHorizon.material.uniforms.cameraPos.value.copy(this.camera.position);
        }
        
        if (this.lensingEffect) {
            this.lensingEffect.material.uniforms.time.value = time;
            this.lensingEffect.material.uniforms.cameraPos.value.copy(this.camera.position);
            // Make the lensing effect follow the camera slightly
            this.lensingEffect.lookAt(this.camera.position);
        }
        
        if (this.accretionDisk) {
            this.accretionDisk.material.uniforms.time.value = time;
            this.accretionDisk.rotation.z += 0.001;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        
        this.updateLabels();
    }

    setupScrollAnimation() {
        // Labels for different scroll phases
        this.labels = {
            eventHorizon: document.getElementById('label-event-horizon'),
            accretion: document.getElementById('label-accretion'),
            lensing: document.getElementById('label-lensing'),
            photon: document.getElementById('label-photon')
        };

        // Camera positions for different phases
        this.cameraPositions = {
            start: { x: 0, y: 3, z: 10 },
            eventHorizon: { x: 0, y: 2, z: 6 },
            accretion: { x: 2, y: 2, z: 5 },
            lensing: { x: -2, y: 1, z: 4 },
            photon: { x: 0, y: 0, z: 3 }
        };

        // Handle scroll events
        window.addEventListener('scroll', () => {
            // Calculate scroll progress (0 to 1)
            const scrollHeight = document.getElementById('scroll-labels').offsetHeight - window.innerHeight;
            this.scrollProgress = window.scrollY / scrollHeight;
            
            // Update visualization based on scroll
            this.updateScrollAnimation();
        });
    }

    updateScrollAnimation() {
        // Phase transitions points
        const phases = {
            initial: 0,
            eventHorizon: 0.2,
            accretion: 0.4,
            lensing: 0.6,
            photon: 0.8
        };

        // Update camera position
        if (this.scrollProgress < phases.eventHorizon) {
            this.updateCameraPosition('start', 'eventHorizon', this.scrollProgress / phases.eventHorizon);
            this.updateLabelVisibility('eventHorizon', this.scrollProgress / phases.eventHorizon);
        } else if (this.scrollProgress < phases.accretion) {
            this.updateCameraPosition('eventHorizon', 'accretion', (this.scrollProgress - phases.eventHorizon) / (phases.accretion - phases.eventHorizon));
            this.updateLabelVisibility('accretion', (this.scrollProgress - phases.eventHorizon) / (phases.accretion - phases.eventHorizon));
        } else if (this.scrollProgress < phases.lensing) {
            this.updateCameraPosition('accretion', 'lensing', (this.scrollProgress - phases.accretion) / (phases.lensing - phases.accretion));
            this.updateLabelVisibility('lensing', (this.scrollProgress - phases.accretion) / (phases.lensing - phases.accretion));
        } else {
            this.updateCameraPosition('lensing', 'photon', (this.scrollProgress - phases.lensing) / (phases.photon - phases.lensing));
            this.updateLabelVisibility('photon', (this.scrollProgress - phases.lensing) / (phases.photon - phases.lensing));
        }

        // Update black hole rotation based on scroll
        if (this.accretionDisk) {
            this.accretionDisk.rotation.z = this.scrollProgress * Math.PI * 2;
        }
    }

    updateCameraPosition(fromPhase, toPhase, progress) {
        const from = this.cameraPositions[fromPhase];
        const to = this.cameraPositions[toPhase];
        
        // Smooth interpolation between camera positions
        this.camera.position.x = from.x + (to.x - from.x) * this.easeInOutCubic(progress);
        this.camera.position.y = from.y + (to.y - from.y) * this.easeInOutCubic(progress);
        this.camera.position.z = from.z + (to.z - from.z) * this.easeInOutCubic(progress);
        
        this.camera.lookAt(0, 0, 0);
    }

    updateLabelVisibility(phase, progress) {
        // Fade out previous label
        Object.keys(this.labels).forEach(key => {
            if (key !== phase) {
                this.labels[key].style.opacity = '0';
            }
        });

        // Fade in current label
        this.labels[phase].style.opacity = this.easeInOutCubic(progress);
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    setupDynamicLabels() {
        this.labelPositions = {
            'event-horizon': { x: 0, y: 0, z: 1 },
            'accretion-disk': { x: 3, y: 1, z: 0 },
            'lensing': { x: -2, y: 2, z: 2 },
            'photon-sphere': { x: 1, y: -2, z: 1 }
        };

        this.labels = {};
        document.querySelectorAll('.label-connector').forEach(label => {
            const target = label.dataset.target;
            this.labels[target] = {
                element: label,
                position: this.labelPositions[target],
                visible: false
            };
        });
    }

    updateLabels() {
        const tempVector = new THREE.Vector3();
        
        Object.entries(this.labels).forEach(([key, label]) => {
            // Get screen position
            tempVector.set(
                label.position.x,
                label.position.y,
                label.position.z
            );
            
            tempVector.project(this.camera);
            
            // Convert to screen coordinates
            const x = (tempVector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-tempVector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Check if point is in front of camera
            if (tempVector.z < 1) {
                label.element.style.transform = `translate(${x}px, ${y}px)`;
                
                // Show label if not visible
                if (!label.visible) {
                    label.element.classList.add('visible');
                    label.visible = true;
                }
            } else {
                // Hide label if behind camera
                if (label.visible) {
                    label.element.classList.remove('visible');
                    label.visible = false;
                }
            }
        });
    }

    setupCardInteractions() {
        // Define camera positions for each view
        this.viewPositions = {
            'event-horizon': {
                position: new THREE.Vector3(0, 0.5, 2.5),
                target: new THREE.Vector3(0, 0, 0)
            },
            'accretion-disk': {
                position: new THREE.Vector3(2, 2, 4),
                target: new THREE.Vector3(0, 0, 0)
            },
            'gravitational-lensing': {
                position: new THREE.Vector3(-2, 1, 4),
                target: new THREE.Vector3(0, 0, 0)
            }
        };

        // Add click event listeners
        const cards = document.querySelectorAll('.component-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const componentId = card.getAttribute('data-component');
                if (componentId && this.viewPositions[componentId]) {
                    this.moveCamera(componentId);
                }
            });
        });

        // Add reset view button
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset View';
        resetBtn.className = 'fixed bottom-6 right-6 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm hover:bg-white/20 transition-all duration-300';
        resetBtn.addEventListener('click', () => this.resetView());
        document.body.appendChild(resetBtn);
    }

    moveCamera(componentId) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const view = this.viewPositions[componentId];
        const duration = 1000; // Animation duration in ms
        const startTime = performance.now();
        
        // Store initial positions
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();

        // Disable controls during animation
        this.controls.enabled = false;

        const animateCamera = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth easing
            const eased = this.easeInOutCubic(progress);

            // Update camera position
            this.camera.position.lerp(view.position, eased);
            this.controls.target.lerp(view.target, eased);
            this.camera.lookAt(this.controls.target);

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                // Animation complete
                this.isAnimating = false;
                this.controls.enabled = true;
                this.highlightCard(componentId);
            }

            this.controls.update();
        };

        requestAnimationFrame(animateCamera);
    }

    resetView() {
        const defaultView = {
            position: new THREE.Vector3(0, 3, 10),
            target: new THREE.Vector3(0, 0, 0)
        };
        
        this.moveCamera('default');
        this.highlightCard(null);
    }

    highlightCard(componentId) {
        // Remove highlight from all cards
        document.querySelectorAll('.component-card').forEach(card => {
            card.classList.remove('active');
        });

        // Add highlight to selected card
        if (componentId && componentId !== 'default') {
            const selectedCard = document.querySelector(`.component-card[data-component="${componentId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('active');
            }
        }
    }
}

// Initialize the visualization
new BlackHoleVisualization(); 