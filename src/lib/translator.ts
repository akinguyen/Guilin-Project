export type ColorCode = 'W' | 'B';

export type TranslationSuggestion = {
  code: string;
  quantity: number;
  kind: 'Box' | 'Door' | 'Drawer Base' | 'Translated Unit';
  note: string;
};

export type TranslationResult = {
  normalizedInput: string;
  familyCode: string;
  familyName: string;
  dimensions: Record<string, number | undefined>;
  suggestions: TranslationSuggestion[];
  explanation: string[];
};

type FamilyRule = {
  code: string;
  name: string;
};

const FAMILY_RULES: FamilyRule[] = [
  { code: 'BBFHD', name: 'Base Blind FHD' },
  { code: 'BFDS', name: 'Base Starter FHD' },
  { code: 'SBFD', name: 'Slink Base FHD' },
  { code: 'WBD', name: 'Wall Bottom Drawer' },
  { code: 'BCD', name: 'Base Curved with Door' },
  { code: 'FDB', name: 'Base FHD' },
  { code: 'BLS', name: 'Lazy Susan' },
  { code: 'BB', name: 'Base Blind' },
  { code: 'DB', name: 'Drawer Base' },
  { code: 'PC', name: 'Pantry' },
  { code: 'SB', name: 'Slink Base' },
  { code: 'V', name: 'Vanity' },
  { code: 'W', name: 'Upper / Wall Cabinet' },
  { code: 'B', name: 'Base' },
];

const COLOR_NAMES: Record<ColorCode, string> = {
  W: 'White',
  B: 'Wood',
};

function normalizeInput(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function detectFamily(code: string) {
  return FAMILY_RULES.find((rule) => code.startsWith(rule.code)) ?? null;
}

function padWidth(value: number) {
  return value.toString().padStart(2, '0');
}

function parseWallDimensions(numericPart: string) {
  if (numericPart.length === 4) {
    return {
      width: Number(numericPart.slice(0, 2)),
      height: Number(numericPart.slice(2, 4)),
    };
  }

  if (numericPart.length === 6) {
    return {
      width: Number(numericPart.slice(0, 2)),
      height: Number(numericPart.slice(2, 4)),
      depth: Number(numericPart.slice(4, 6)),
    };
  }

  throw new Error('Wall cabinet codes should contain 4 digits (width + height) or 6 digits (width + height + depth).');
}

function parseBaseDimensions(numericPart: string) {
  if (numericPart.length === 2) {
    return {
      width: Number(numericPart),
    };
  }

  if (numericPart.length === 4) {
    return {
      width: Number(numericPart.slice(0, 2)),
      height: Number(numericPart.slice(2, 4)),
    };
  }

  if (numericPart.length === 6) {
    return {
      width: Number(numericPart.slice(0, 2)),
      height: Number(numericPart.slice(2, 4)),
      depth: Number(numericPart.slice(4, 6)),
    };
  }

  throw new Error('Base-style codes should contain 2, 4, or 6 digits after the prefix.');
}

function parseDrawerBaseDimensions(numericPart: string) {
  if (numericPart.length < 3) {
    throw new Error('Drawer Base codes need at least 3 digits: width + drawer count.');
  }

  return {
    width: Number(numericPart.slice(0, 2)),
    drawers: Number(numericPart.slice(2)),
  };
}

function formatUnitCode(prefix: string, sizeToken: string, partCode: string, color: ColorCode) {
  return `${prefix}${sizeToken}-${partCode}-${color}`;
}

function buildWallSuggestions(prefix: string, numericPart: string, color: ColorCode) {
  const dimensions = parseWallDimensions(numericPart);
  const width = dimensions.width;
  const doorWidth = width / 2;
  const sizeToken = numericPart;
  const suggestions: TranslationSuggestion[] = [
    {
      code: formatUnitCode(prefix, sizeToken, 'B', color),
      quantity: 1,
      kind: 'Box',
      note: 'One box is needed for the cabinet body.',
    },
  ];
  const explanation = [
    `${prefix} means ${prefix === 'W' ? 'an upper / wall cabinet' : 'this furniture family'}.`,
    `${width} is the cabinet width${'height' in dimensions ? `, ${dimensions.height} is the height` : ''}${
      'depth' in dimensions ? `, and ${dimensions.depth} is the depth` : ''
    }.`,
  ];

  if (Number.isInteger(doorWidth)) {
    const doorToken = `${padWidth(doorWidth)}${numericPart.slice(2)}`;

    suggestions.push({
      code: formatUnitCode(prefix, doorToken, 'D', color),
      quantity: 2,
      kind: 'Door',
      note: 'The width is split into two equal doors, so each door uses half of the cabinet width.',
    });

    explanation.push(`The ${width}" width divides evenly into two ${doorWidth}" doors.`);
  } else {
    explanation.push('The width does not divide evenly into two doors, so a door suggestion was not auto-generated.');
  }

  return { dimensions, suggestions, explanation };
}

function buildBaseSuggestions(prefix: string, numericPart: string, color: ColorCode) {
  const dimensions = parseBaseDimensions(numericPart);
  const suggestions: TranslationSuggestion[] = [
    {
      code: formatUnitCode(prefix, numericPart, 'B', color),
      quantity: 1,
      kind: 'Box',
      note: 'This is the translated base box code using the selected finish color.',
    },
  ];

  return {
    dimensions,
    suggestions,
    explanation: [
      `${prefix} means ${detectFamily(prefix)?.name ?? 'this furniture family'}.`,
      `${dimensions.width} is the base width.`,
    ],
  };
}

function buildDrawerBaseSuggestions(prefix: string, numericPart: string, color: ColorCode) {
  const dimensions = parseDrawerBaseDimensions(numericPart);

  return {
    dimensions,
    suggestions: [
      {
        code: formatUnitCode(prefix, numericPart, 'B', color),
        quantity: 1,
        kind: 'Drawer Base' as const,
        note: `This keeps the ${dimensions.width}" width and ${dimensions.drawers} drawer layout in the new format.`,
      },
    ],
    explanation: [
      `${prefix} means Drawer Base.`,
      `${dimensions.width} is the width and ${dimensions.drawers} is the drawer count.`,
    ],
  };
}

export function translateOldCode(input: string, color: ColorCode): TranslationResult {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput) {
    throw new Error('Enter an old furniture code to translate.');
  }

  const family = detectFamily(normalizedInput);

  if (!family) {
    throw new Error('This furniture prefix is not recognized yet. Add a rule for this family before translating it.');
  }

  const suffixlessInput = normalizedInput.replace(/[LR]$/, '');
  const numericPart = suffixlessInput.slice(family.code.length);

  if (!numericPart || /\D/.test(numericPart)) {
    throw new Error('After the furniture prefix, the rest of the code should be numeric for this translator.');
  }

  let result: Pick<TranslationResult, 'dimensions' | 'suggestions' | 'explanation'>;

  if (family.code === 'W') {
    result = buildWallSuggestions(family.code, numericPart, color);
  } else if (family.code === 'DB') {
    result = buildDrawerBaseSuggestions(family.code, numericPart, color);
  } else {
    result = buildBaseSuggestions(family.code, numericPart, color);
  }

  return {
    normalizedInput,
    familyCode: family.code,
    familyName: family.name,
    dimensions: result.dimensions,
    suggestions: result.suggestions,
    explanation: [
      ...result.explanation,
      `Color ${color} means ${COLOR_NAMES[color]}.`,
      normalizedInput.endsWith('L') || normalizedInput.endsWith('R')
        ? 'A trailing L or R is treated as a left/right old-code marker and removed before building the new code.'
        : 'No left/right marker was detected on the old code.',
    ],
  };
}
