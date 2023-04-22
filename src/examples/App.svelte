<script global>
    let fps = 0;
</script>

<div class="grid grid-cols-3">
    <div class="col-span-2">
        <div class="relative">
            <div class="absolute top-0 left-0">
                FPS: {fps}
            </div>
            <canvas id="glcanvas" width="640" height="480"></canvas>
        </div>
    </div>
    <div class="col-span-1">
        <div class="flex justify-center">
            <h1>Image</h1>
        </div>
    </div>
</div>
