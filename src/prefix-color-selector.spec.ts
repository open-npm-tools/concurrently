/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "assertSelectedColors"] }] */

import { PrefixColorSelector } from './prefix-color-selector';

function assertSelectedColors({
    customColors,
    expectedColors,
}: {
    customColors?: string[];
    expectedColors: string[];
}) {
    const prefixColorSelector = new PrefixColorSelector(customColors);
    const prefixColorSelectorValues = [];
    for (let i = 0; i < expectedColors.length; i++) {
        prefixColorSelectorValues.push(prefixColorSelector.getNextColor());
    }

    expect(prefixColorSelectorValues).toEqual(expectedColors);
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('#getNextColor', function () {
    it('does not produce a color if prefixColors empty', () => {
        assertSelectedColors({
            customColors: [],
            expectedColors: ['', '', ''],
        });
    });

    it('does not produce a color if prefixColors undefined', () => {
        assertSelectedColors({
            expectedColors: ['', '', ''],
        });
    });

    it('uses user defined prefix colors only, if no auto is used', () => {
        assertSelectedColors({
            customColors: ['red', 'green', 'blue'],
            expectedColors: [
                'red',
                'green',
                'blue',

                // Uses last color if last color is not "auto"
                'blue',
                'blue',
                'blue',
            ],
        });
    });

    it('picks varying colors when user defines an auto color', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            customColors: [
                'red',
                'green',
                'auto',
                'green',
                'auto',
                'green',
                'auto',
                'blue',
                'auto',
                'orange',
            ],
            expectedColors: [
                // Custom colors
                'red',
                'green',
                'blue', // Picks auto color "blue", not repeating consecutive "green" color
                'green', // Manual
                'blue', // Auto picks "blue" not to repeat last
                'green', // Manual
                'blue', // Auto picks "blue" again not to repeat last
                'blue', // Manual
                'green', // Auto picks "green" again not to repeat last
                'orange',

                // Uses last color if last color is not "auto"
                'orange',
                'orange',
                'orange',
            ],
        });
    });

    it('uses user defined colors then recurring auto colors without repeating consecutive colors', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            customColors: ['red', 'green', 'auto'],
            expectedColors: [
                // Custom colors
                'red',
                'green',

                // Picks auto colors, not repeating consecutive "green" color
                'blue',
                'green',
                'blue',
                'green',
            ],
        });
    });

    it('can sometimes produce consecutive colors', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            customColors: ['blue', 'auto'],
            expectedColors: [
                // Custom colors
                'blue',

                // Picks auto colors
                'green',
                // Does not repeat custom colors for initial auto colors, i.e. does not use "blue" again so soon
                'green', // Consecutive color picked, however practically there would be a lot of colors that need to be set in a particular order for this to occur
                'blue',
                'green',
                'blue',
                'green',
                'blue',
            ],
        });
    });

    it('considers the Bright variants of colors equal to the normal colors to avoid similar colors', function () {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'greenBright',
            'blueBright',
            'green',
            'blue',
            'magenta',
        ]);

        assertSelectedColors({
            customColors: ['green', 'blue', 'auto'],
            expectedColors: [
                // Custom colors
                'green',
                'blue',

                // Picks auto colors, not repeating green and blue colors and variants initially
                'magenta',

                // Picks auto colors
                'greenBright',
                'blueBright',
                'green',
                'blue',
                'magenta',
            ],
        });
    });

    it('does not repeat consecutive colors when last prefixColor is auto', () => {
        const prefixColorSelector = new PrefixColorSelector(['auto']);

        // Pick auto colors over 2 sets
        const expectedColors: string[] = [
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
        ];

        expectedColors.reduce((previousColor, currentExpectedColor) => {
            const actualSelectedColor = prefixColorSelector.getNextColor();
            expect(actualSelectedColor).not.toBe(previousColor); // No consecutive colors
            expect(actualSelectedColor).toBe(currentExpectedColor); // Expected color
            return actualSelectedColor;
        }, '');
    });

    it('handles when more individual auto prefixColors exist than acceptable console colors', () => {
        // Pick auto colors over 2 sets
        const expectedColors: string[] = [
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
        ];

        const prefixColorSelector = new PrefixColorSelector(expectedColors.map(() => 'auto'));

        expectedColors.reduce((previousColor, currentExpectedColor) => {
            const actualSelectedColor = prefixColorSelector.getNextColor();
            expect(actualSelectedColor).not.toBe(previousColor); // No consecutive colors
            expect(actualSelectedColor).toBe(currentExpectedColor); // Expected color
            return actualSelectedColor;
        }, '');
    });
});

describe('PrefixColorSelector#ACCEPTABLE_CONSOLE_COLORS', () => {
    it('has more than 1 auto color defined', () => {
        // ! Code assumes this always has more than one entry, so make sure
        expect(PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.length).toBeGreaterThan(1);
    });
});
