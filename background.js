/* 
   CHRONOS VELOCITY: WEBGPU PARTICLE ENGINE
   Renders a time-warp field using Compute Shaders.
*/

const canvas = document.createElement('canvas');
document.body.prepend(canvas); // Put it behind everything
canvas.id = 'bg-canvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1'; // Behind the UI
canvas.style.opacity = '0.6'; // Subtle blend
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const WGSL_SHADER = `
struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>,
    life: f32,
    seed: f32,
};

struct Params {
    mouse: vec2<f32>,
    time: f32,
    screen: vec2<f32>,
    theme: f32, // 0.0 = Dark, 1.0 = Light
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

// Random helper
fn rand(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }

@compute @workgroup_size(64)
fn update(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let index = GlobalInvocationID.x;
    if (index >= arrayLength(&particles)) { return; }

    var p = particles[index];

    // Physics
    p.pos = p.pos + p.vel;
    
    // Warp Speed effect (move towards edges)
    let center = params.screen * 0.5;
    let dir = normalize(p.pos - center);
    let dist = distance(p.pos, center);
    
    // Acceleration based on distance from center
    p.vel = p.vel + (dir * 0.05);

    // Mouse Interaction (Gravity)
    let mouseDist = distance(p.pos, params.mouse);
    if (mouseDist < 200.0) {
        let mouseDir = normalize(params.mouse - p.pos);
        p.vel = p.vel + (mouseDir * 0.2);
    }

    // Reset if off screen
    if (p.pos.x < 0.0 || p.pos.x > params.screen.x || p.pos.y < 0.0 || p.pos.y > params.screen.y) {
        // Reset to center area
        let r = rand(params.time + f32(index)) * 6.28;
        let d = rand(params.time - f32(index)) * 50.0;
        p.pos = center + vec2<f32>(cos(r)*d, sin(r)*d);
        p.vel = vec2<f32>(cos(r), sin(r)) * 0.5;
    }

    particles[index] = p;
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> @builtin(position) vec4<f32> {
    let p = particles[instanceIndex];
    
    // Simple point quad
    let size = 2.0;
    var pos = vec2<f32>(0.0);
    if (vertexIndex == 0u) { pos = vec2<f32>(-1.0, -1.0); }
    else if (vertexIndex == 1u) { pos = vec2<f32>(1.0, -1.0); }
    else if (vertexIndex == 2u) { pos = vec2<f32>(-1.0, 1.0); }
    else if (vertexIndex == 3u) { pos = vec2<f32>(-1.0, 1.0); }
    else if (vertexIndex == 4u) { pos = vec2<f32>(1.0, -1.0); }
    else if (vertexIndex == 5u) { pos = vec2<f32>(1.0, 1.0); }

    let worldPos = p.pos + (pos * size);
    
    // Normalize to clip space -1 to 1
    let clipPos = (worldPos / params.screen) * 2.0 - 1.0;
    
    // Flip Y because WebGPU is Y-up? No, Y-down in clip space logic usually
    return vec4<f32>(clipPos.x, -clipPos.y, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    // Theme 0 (Dark): Rose Gold (0.89, 0.65, 0.65)
    // Theme 1 (Light): Deep Ink (0.1, 0.1, 0.1)
    let colorDark = vec4<f32>(0.89, 0.65, 0.65, 0.8);
    let colorLight = vec4<f32>(0.2, 0.2, 0.2, 0.6);
    
    return mix(colorDark, colorLight, params.theme);
}
`;

// --- JS INITIALIZATION ---
let device, context, pipeline, bindGroup, computePipeline;
let particleBuffer, uniformBuffer;
const numParticles = 5000;
const paramsSize = 32; // vec2(8) + f32(4) + vec2(8) + f32(4) = 24 -> padded to 32
let mouseX = 0, mouseY = 0;

async function initWebGPU() {
    if (!navigator.gpu) return; // Fallback to CSS
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    
    device = await adapter.requestDevice();
    context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    
    context.configure({ device, format });

    // 1. Shaders
    const module = device.createShaderModule({ code: WGSL_SHADER });

    // 2. Buffers
    particleBuffer = device.createBuffer({
        size: numParticles * 24, // vec2+vec2+f32+f32 = 24 bytes
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    uniformBuffer = device.createBuffer({
        size: paramsSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 3. Pipelines
    computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: 'update' }
    });

    pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs_main' },
        fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
    });

    // 4. Bind Groups
    // Note: We use one bind group for both compute and render for simplicity in this demo
    // Ideally separate them, but we pass the storage buffer to both logic
    // Actually, render pipeline can't easily see storage buffer in vertex easily without specific layout
    // For simplicity, we assume compute updates buffer, vertex reads it? No, vertex needs buffer inputs.
    // Let's stick to a simpler logic: Vertex pulls from Storage.
    
    const bindGroupLayout = computePipeline.getBindGroupLayout(0);
    bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: particleBuffer } },
        ]
    });

    // Initialize Particles
    const initData = new Float32Array(numParticles * 6);
    for (let i = 0; i < numParticles; i++) {
        initData[i*6 + 0] = Math.random() * canvas.width; // x
        initData[i*6 + 1] = Math.random() * canvas.height; // y
        initData[i*6 + 2] = (Math.random() - 0.5) * 2; // vx
        initData[i*6 + 3] = (Math.random() - 0.5) * 2; // vy
        initData[i*6 + 4] = 1.0; // life
        initData[i*6 + 5] = Math.random(); // seed
    }
    device.queue.writeBuffer(particleBuffer, 0, initData);

    requestAnimationFrame(frame);
}

function frame(time) {
    // Update Uniforms
    const isLight = document.body.classList.contains('light-mode') ? 1.0 : 0.0;
    const params = new Float32Array([
        mouseX, mouseY, 
        time * 0.001, 
        canvas.width, canvas.height,
        isLight, 0.0 // Padding
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, params);

    const commandEncoder = device.createCommandEncoder();

    // Compute Pass
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(numParticles / 64));
    passEncoder.end();

    // Render Pass
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            storeOp: 'store',
        }]
    });
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6, numParticles);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
}

window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Boot
initWebGPU();
