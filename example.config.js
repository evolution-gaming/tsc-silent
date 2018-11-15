
module.exports = {
    suppress: [
        {
            pathRegExp: '/src/js/general',
            codes: [7006, 7017],
        },
        {
            pathRegExp: '/packages/evo-foo/src/engine/.*.spec..*',
            codes: [2322, 2339, 2341, 2445, 2531, 2540],
        },
    ],
};
