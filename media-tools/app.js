// Utility function to format file size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Tab Switching Logic
function switchTab(tabId) {
    // Hide all contents
    document.getElementById('content-compress-img').classList.add('hidden');
    document.getElementById('content-convert-img').classList.add('hidden');
    document.getElementById('content-compress-vid').classList.add('hidden');

    // Reset all tabs
    const tabs = ['tab-compress-img', 'tab-convert-img', 'tab-compress-vid'];
    tabs.forEach(id => {
        document.getElementById(id).classList.remove('tab-active');
        document.getElementById(id).classList.add('text-gray-500');
    });

    // Show selected content and activate tab
    document.getElementById('content-' + tabId).classList.remove('hidden');
    document.getElementById('tab-' + tabId).classList.add('tab-active');
    document.getElementById('tab-' + tabId).classList.remove('text-gray-500');
}

// Update range slider values
document.getElementById('img-compress-quality').addEventListener('input', function(e) {
    document.getElementById('img-compress-quality-val').textContent = e.target.value;
});

document.getElementById('vid-compress-crf').addEventListener('input', function(e) {
    document.getElementById('vid-compress-crf-val').textContent = e.target.value;
});

// Image Compression Logic
function compressImage() {
    const fileInput = document.getElementById('img-compress-file');
    if (fileInput.files.length === 0) {
        alert('Pilih gambar terlebih dahulu.');
        return;
    }

    const file = fileInput.files[0];
    const quality = document.getElementById('img-compress-quality').value / 100;

    // We preserve the original format for compression, unless it's a format not supported by canvas.toDataURL well
    // Usually image/jpeg and image/webp support quality parameter well.
    let targetType = file.type;
    if(targetType === 'image/png') {
        // PNG doesn't support quality in canvas toDataURL the same way, but let's keep it or convert to webp/jpeg to actually compress
        // For pure compression tool keeping original extension, we might force JPEG or WebP if they want size reduction.
        // Let's stick to original, but note that for PNG, canvas quality param is often ignored by browsers.
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // If original is PNG but user wants "compression", we might convert to webp internally or just pass quality
            const compressedDataUrl = canvas.toDataURL(targetType, quality);

            // Show results
            document.getElementById('img-compress-result').classList.remove('hidden');

            // Old
            document.getElementById('img-compress-preview-old').src = event.target.result;
            document.getElementById('img-compress-size-old').textContent = formatBytes(file.size);

            // New
            document.getElementById('img-compress-preview-new').src = compressedDataUrl;

            // Calculate new size approximately from base64
            const base64str = compressedDataUrl.split(',')[1];
            const decoded = atob(base64str);
            const newSize = decoded.length;
            document.getElementById('img-compress-size-new').textContent = formatBytes(newSize);

            // Set download link
            const downloadLink = document.getElementById('img-compress-download');
            downloadLink.href = compressedDataUrl;
            downloadLink.download = `compressed_${file.name}`;
        }
    }
}

// Image Conversion Logic
function convertImage() {
    const fileInput = document.getElementById('img-convert-file');
    if (fileInput.files.length === 0) {
        alert('Pilih gambar terlebih dahulu.');
        return;
    }

    const file = fileInput.files[0];
    const targetType = document.getElementById('img-convert-target').value;

    let extension = 'jpg';
    if(targetType === 'image/webp') extension = 'webp';
    if(targetType === 'image/jpeg') extension = 'jpeg'; // or jpg

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            // For PNG to JPEG, background might be transparent, fill with white first
            if(targetType === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            const convertedDataUrl = canvas.toDataURL(targetType, 0.9); // high quality conversion

            // Show results
            document.getElementById('img-convert-result').classList.remove('hidden');

            // Old
            document.getElementById('img-convert-preview-old').src = event.target.result;
            document.getElementById('img-convert-size-old').textContent = formatBytes(file.size);

            // New
            document.getElementById('img-convert-preview-new').src = convertedDataUrl;

            // Calculate new size approximately
            const base64str = convertedDataUrl.split(',')[1];
            const decoded = atob(base64str);
            const newSize = decoded.length;
            document.getElementById('img-convert-size-new').textContent = formatBytes(newSize);

            // Set download link
            const downloadLink = document.getElementById('img-convert-download');
            downloadLink.href = convertedDataUrl;

            // Replace old extension with new
            const originalName = file.name;
            const newName = originalName.substring(0, originalName.lastIndexOf('.')) + '.' + extension;
            downloadLink.download = newName;
        }
    }
}

// FFmpeg logic for Video Compression
const { FFmpeg } = FFmpegWASM;
const { fetchFile } = FFmpegUtil;

let ffmpeg = null;

async function loadFFmpeg() {
    if (ffmpeg === null) {
        ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            document.getElementById('vid-compress-status').innerHTML = `Memproses: ${Math.round(progress * 100)}% selesai.`;
        });

        // Load ffmpeg
        document.getElementById('vid-compress-status').innerHTML = "Memuat alat pemrosesan video (ini mungkin memakan waktu sebentar)...";
        await ffmpeg.load({
            coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
            wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
        });
        document.getElementById('vid-compress-status').innerHTML = "Siap untuk memproses.";
    }
}

async function compressVideo() {
    const fileInput = document.getElementById('vid-compress-file');
    if (fileInput.files.length === 0) {
        alert('Pilih video MP4 terlebih dahulu.');
        return;
    }

    const btn = document.getElementById('btn-compress-vid');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('vid-compress-result').classList.add('hidden');

    try {
        await loadFFmpeg();

        const file = fileInput.files[0];
        const crf = document.getElementById('vid-compress-crf').value;
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        document.getElementById('vid-compress-status').innerHTML = "Menyiapkan file...";

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        document.getElementById('vid-compress-status').innerHTML = "Mulai kompresi (ini akan memakan waktu, terutama untuk video besar)...";

        // Run FFmpeg command: compress using libx264 with specific crf and fast preset
        await ffmpeg.exec(['-i', inputName, '-vcodec', 'libx264', '-crf', crf.toString(), '-preset', 'fast', outputName]);

        document.getElementById('vid-compress-status').innerHTML = "Menyelesaikan...";

        const data = await ffmpeg.readFile(outputName);
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(videoBlob);

        // Show Results
        document.getElementById('vid-compress-result').classList.remove('hidden');
        document.getElementById('vid-compress-size-old').textContent = formatBytes(file.size);
        document.getElementById('vid-compress-size-new').textContent = formatBytes(videoBlob.size);

        document.getElementById('vid-compress-preview').src = videoUrl;

        const downloadLink = document.getElementById('vid-compress-download');
        downloadLink.href = videoUrl;
        downloadLink.download = `compressed_${file.name}`;

        document.getElementById('vid-compress-status').innerHTML = "Selesai!";

        // Clean up
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

    } catch (error) {
        console.error(error);
        document.getElementById('vid-compress-status').innerHTML = `<span class="text-red-600">Terjadi kesalahan saat memproses video. Periksa console untuk detail.</span>`;
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}
