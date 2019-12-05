
module.exports = {
    suppress: [
        {
            // Ignore codes `7006, 7017` in `/src/js/general` directory
            pathRegExp: '/src/js/general',
            codes: [7006, 7017],
        },
        {
            // Ignore codes `2322, 2339, 2341, 2445, 2531, 2540` in *.spec.* files located in `/packages/foo/src/engine/`
            pathRegExp: '/packages/foo/src/engine/.*\\.spec\\..*',
            codes: [2322, 2339, 2341, 2445, 2531, 2540],
        },
    ],
};
