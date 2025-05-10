import { defineArrayMember, defineField, defineType} from 'sanity'
import { SynthPlayer } from '../components/synthPlayer';

const synthDocument = defineType({
  name: 'synth',
  title: 'Synth',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Synth Name',
      type: 'string',
    }),
    defineField({
      name: 'waveform',
      title: 'Waveform',
      type: 'string',
      options: {
        list: [
          {title: 'Sine', value: 'sine'},
          {title: 'Saw', value: 'saw'},
          {title: 'Square', value: 'square'},
          {title: 'Triangle', value: 'triangle'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
        name: 'tempo',
        title: 'Tempo (BPM)',
        type: 'number',
        initialValue: 120,
    }),
    defineField({
      name: 'baseFrequency',
      title: 'Base Frequency (Hz)',
      type: 'number',
      validation: (rule) => rule.min(20).max(20000),
    }),
    defineField({
      name: 'playBtn',
      title: 'Play',
      type: 'string',
      components: {
          input: SynthPlayer,
      },
    }),
    defineField({
      name: 'melodies',
      title: 'Melodies',
      type: 'array',
      of: [
        defineArrayMember({ type: 'reference', to: [{ type: 'melody' }] }),
      ],
    }),
  ],
});

const midiNoteObject = defineType({
  name: 'midiNote',
  title: 'MIDI Note',
  type: 'object',
  preview: {
    select: {
      title: 'note',
      velocity: 'velocity',
      gate: 'gate',
    },
    prepare({title, velocity, gate}) {
      return {
        title: title,
        subtitle: `Velocity: ${velocity} - Gate: ${gate}%`,
      }
    },
  },
  fields: [
    defineField({
      name: 'note',
      title: 'Note',
      type: 'string',
      initialValue: 'C4',
      validation: (rule) => rule.required().min(2).max(3),
    }),
    defineField({
      name: 'velocity',
      title: 'Velocity',
      type: 'number',
      initialValue: 100,
      validation: (rule) => rule.min(0).max(100),
    }),
    defineField({
      name: 'gate',
      title: 'Gate (%)',
      type: 'number',
      initialValue: 50,
      validation: (rule) => rule.min(0).max(100),
    }),
    defineField({
      name: 'channel',
      title: 'MIDI Channel',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.min(1).max(16),
    }),
  ],
});

const melodyDocument = defineType({
    name: 'melody',
    title: 'Melody',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'arpeggiator',
            title: 'Arpeggiator type',
            type: 'string',
            initialValue: 'forward',
            validation: (rule) => rule.required(),
            options: {
                list: [
                    {title: 'Forward', value: 'forward'},
                    {title: 'Backward', value: 'backward'},
                    {title: 'Up', value: 'up'},
                    {title: 'Down', value: 'down'},
                    {title: 'Inclusive', value: 'inclusive'},
                    {title: 'Exclusive', value: 'exclusive'},
                    {title: 'Random', value: 'random'},
                ],
                layout: 'dropdown' // This is the default layout
            }
        }),
        defineField({
            name: 'notes',
            title: 'MIDI Notes',
            type: 'array',
            of: [
                defineArrayMember({ type: 'midiNote', }),
            ],
        }),
    ],
});

export const schemaTypes = [
    synthDocument,
    melodyDocument,

    midiNoteObject,
];
