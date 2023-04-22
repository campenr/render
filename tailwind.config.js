module.exports = {
    theme: {
        fontFamily: {
            'sans': ['Libre Franklin', 'sans-serif'],
        },
        extend: {
            screens: {
                xs: '480px',
            }
        }
    },
    purge: {
        mode: 'jit',
        content: ['./**/**/*.html', './**/**/*.svelte'],
    },
};
