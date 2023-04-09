An experiment in WebGL rendering

Also uses:
- typescript for main js application
- assemblyscript for high performant code
- webpack and esbuild for js tooling

To get going:

```
# base setup
nvm install
nvm use
npm install

# build assemblyscript module(s)
npm run asbuild

# run webpack dev server
npm run start

```

Note: webpack is using esbuild for transpilation. To get typechecking use `npm run type` separately.
