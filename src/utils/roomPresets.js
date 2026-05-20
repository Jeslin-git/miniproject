export const DYNAMIC_ROOM_PRESETS = {
    office: {
        walls: [
            // Fractional wall positions relative to the dimension:
            // xWeight, zWeight, yOffset, wWeight, dWeight, rotY
            { xWeight: 0, zWeight: -0.5, yOffset: 1.5, wWeight: 1, dWeight: 0.1, rotY: 0 },   // Back Wall
            { xWeight: 0, zWeight: 0.5, yOffset: 1.5, wWeight: 1, dWeight: 0.1, rotY: 0 },    // Front Wall
            { xWeight: -0.5, zWeight: 0, yOffset: 1.5, wWeight: 0.1, dWeight: 1, rotY: 0 },   // Left Wall
            { xWeight: 0.5, zWeight: 0, yOffset: 1.5, wWeight: 0.1, dWeight: 1, rotY: 0 }     // Right Wall
        ],
        furniture: [
            // Fractional position relative to dimensions: xWeight, zWeight, yOffset, type, props
            { xWeight: 0, zWeight: 0, yOffset: 0.4, type: 'table', props: { color: '#8d6e63', size: 'large' } },
            { xWeight: 0, zWeight: 0.25, yOffset: 0.35, type: 'chair', props: { color: '#111111' } },
            { xWeight: -0.35, zWeight: -0.35, yOffset: 0.6, type: 'lamp', props: { color: '#ffdd88' } }
        ]
    },
    living: {
        walls: [
            { xWeight: 0, zWeight: -0.5, yOffset: 1.5, wWeight: 1, dWeight: 0.1, rotY: 0 },
            { xWeight: 0, zWeight: 0.5, yOffset: 1.5, wWeight: 1, dWeight: 0.1, rotY: 0 },
            { xWeight: -0.5, zWeight: 0, yOffset: 1.5, wWeight: 0.1, dWeight: 1, rotY: 0 },
            { xWeight: 0.5, zWeight: 0, yOffset: 1.5, wWeight: 0.1, dWeight: 1, rotY: 0 }
        ],
        furniture: [
            { xWeight: 0, zWeight: 0, yOffset: 0.1, type: 'carpet', props: { color: '#334455' } },
            { xWeight: 0, zWeight: -0.2, yOffset: 0.5, type: 'sofa', props: { color: '#3344aa', size: 'large' } },
            { xWeight: -0.3, zWeight: 0.3, yOffset: 0.4, type: 'chair', props: { color: '#666666' } },
            { xWeight: 0.3, zWeight: 0.3, yOffset: 0.4, type: 'chair', props: { color: '#666666' } }
        ]
    }
};
