<script>
    import { fps } from "./store"
    let fpsValue;
    fps.subscribe((value) => fpsValue = value)

    import { controls } from "./store"
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
        { #each controlItems as control }
            <div class="border-b border-black">
                <div class="flex px-1">
                    <div class="mr-auto">{ control }:</div>
                    <div>
                        <input
                            type="number"
                            value="{ controls[control] }"
                            class="bg-neutral-700 w-[60px]"
                            min="0" max="250"
                            on:change="{(e) => controls[control] = e.target.value}"
                        >
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>
