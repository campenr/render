<script>
    export let controlName;
    export let controlItem;
</script>

<div class="border-b border-black">
    <div class="flex px-1">
        <div class="mr-auto">{ controlName }:</div>
        <div>
            { #if controlItem.type === 'number' }
                <input
                    type="number"
                    value="{ controlItem.value }"
                    class="bg-neutral-700 w-[60px]"
                    min="0" max="250"
                    on:change="{(e) => controlItem.value = e.target.value}"
                >
            { :else if controlItem.type === 'choice' }
                <select
                    value="{ controlItem.value }"
                    class="bg-neutral-700"
                    on:change="{(e) => controlItem.value = e.target.value}"
                >
                    { #each controlItem.choices as option }
                        <option value="{ option }">{ option }</option>
                    { /each }
                </select>
            { /if }
        </div>
    </div>
</div>

