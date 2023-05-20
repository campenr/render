<script>
    import Widget from './widgets.svelte';
    import { controls, fps } from './store'

    let fpsValue;
    fps.subscribe((value) => fpsValue = value)

    let controlItems = [];
    const ignored = ['set', 'update', 'subscribe'];
    Object.keys(controls).forEach(item => {
        if (!ignored.includes(item)) {
            controlItems.push(item);
        }
    })
</script>

<div class="grid grid-cols-3">
    <div class="col-span-2 border border-black">
        <div class="relative">
            <div class="absolute top-0 left-0">
                FPS: { fpsValue }
            </div>
            <canvas id="glcanvas" width="640" height="480" class="w-full h-auto"></canvas>
        </div>
    </div>
    <div class="col-span-1 border-r border-y border-black">
        <div class="border-b border-black">
            <div class="flex justify-center">
                <h1>Demo: { document.title }</h1>
            </div>
        </div>
        { #each controlItems as controlName }
            <Widget controlName="{ controlName }" controlItem="{ controls[controlName] }" />
        { /each }
    </div>
</div>
