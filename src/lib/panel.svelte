<div class="panel"
     class:open={active}>
    <button
            class="header"
            on:click={() => {
			dispatcher("select", group === key ? '' : key);
			group = group === key ? -1 : key;
		}}
    >
        <slot name="name"><span>{name}</span></slot>
        <i class="icon" class:active>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
            </svg>
        </i>
    </button>

    {#if active}
        <div class="content" transition:slide>
            <slot />
        </div>
    {/if}
</div>

<script>
	import {createEventDispatcher} from "svelte";
	import {slide} from 'svelte/transition';

	let dispatcher = createEventDispatcher();

	export let name = '';
	export let group = 0;
	export let key = new Date().getMilliseconds();
	$: active = group === key;
</script>

<style>
    .panel {
        border-bottom: 1px solid #dfdfdf;
    }
    .header {
        display: flex;
        width: 100%;
        cursor: pointer;
        background: none;
        line-height: 1;
        border: none;
        outline: none;
        margin: 0;
        padding: 12px 24px;
        text-align: left;
        outline: none;
    }
    .header:active {
        background: none;
    }
    .open > .header {
        position: sticky;
        top: 0;
        background-color: var(--panelBackground, transparent)
    }
    span {
        flex: 1;
        line-height: 24px;
    }
    .icon {
        line-height: 0.5;
        transition: 0.25s linear;
    }
    .active {
        transform: rotate(-180deg);
    }

    .content {
        margin: 0;
        padding: 0 24px 16px;
    }
</style>
