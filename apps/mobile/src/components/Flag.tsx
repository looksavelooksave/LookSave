import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

/**
 * Dumaloq davlat bayroqlari — til tanlashda.
 *
 * ⚠️ NEGA EMOJI EMAS. Bayroq emojisi tizim shriftiga bog'liq: iOS
 * simulyatorida va ba'zi Android qurilmalarida u «?» qutichasi bo'lib
 * chiqdi. SVG hamma joyda bir xil chiziladi va rasm yuklashni talab
 * qilmaydi.
 *
 * Chizmalar 60×60 kvadratda, doira bilan kesiladi. Mayda tafsilotlar
 * (O'zbekiston yulduzlari) atayin soddalashtirilgan — 30 pt da ular
 * baribir nuqta bo'lib ko'rinadi.
 */

export type FlagCode = 'uz' | 'ru' | 'gb' | 'ae';

function Uzbekistan(): JSX.Element {
  return (
    <G>
      <Rect width={60} height={20} fill="#0099B5" />
      <Rect y={20} width={60} height={20} fill="#FFFFFF" />
      <Rect y={40} width={60} height={20} fill="#1EB53A" />
      <Rect y={19} width={60} height={1.6} fill="#CE1126" />
      <Rect y={39.4} width={60} height={1.6} fill="#CE1126" />
      {/* Yarim oy: oq doiradan ko'k doira kesib olinadi */}
      <Circle cx={17} cy={10} r={6} fill="#FFFFFF" />
      <Circle cx={19.4} cy={10} r={5.1} fill="#0099B5" />
      {[26, 30.5, 35].map((x) => (
        <Circle key={x} cx={x} cy={10} r={1} fill="#FFFFFF" />
      ))}
    </G>
  );
}

function Russia(): JSX.Element {
  return (
    <G>
      <Rect width={60} height={20} fill="#FFFFFF" />
      <Rect y={20} width={60} height={20} fill="#0039A6" />
      <Rect y={40} width={60} height={20} fill="#D52B1E" />
    </G>
  );
}

function UnitedKingdom(): JSX.Element {
  return (
    <G>
      <Rect width={60} height={60} fill="#012169" />
      <Path d="M0 0 L60 60 M60 0 L0 60" stroke="#FFFFFF" strokeWidth={12} />
      <Path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth={4} />
      <Path d="M30 0 V60 M0 30 H60" stroke="#FFFFFF" strokeWidth={16} />
      <Path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth={9} />
    </G>
  );
}

function Emirates(): JSX.Element {
  return (
    <G>
      <Rect width={60} height={20} fill="#00732F" />
      <Rect y={20} width={60} height={20} fill="#FFFFFF" />
      <Rect y={40} width={60} height={20} fill="#000000" />
      <Rect width={18} height={60} fill="#FF0000" />
    </G>
  );
}

const FLAGS: Record<FlagCode, () => JSX.Element> = {
  uz: Uzbekistan,
  ru: Russia,
  gb: UnitedKingdom,
  ae: Emirates,
};

export function Flag({ code, size = 28 }: { code: FlagCode; size?: number }): JSX.Element {
  const Drawing = FLAGS[code];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <ClipPath id={`flag-${code}`}>
          <Circle cx={30} cy={30} r={30} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#flag-${code})`}>
        <Drawing />
      </G>
      {/* Ingichka ichki chegara — oq yo'lli bayroq qorong'i fonda erib ketmasin */}
      <Circle
        cx={30}
        cy={30}
        r={29.5}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />
    </Svg>
  );
}
