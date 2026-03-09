import { useMemo, useRef, useState } from 'react';
import { Upload, ImageIcon, Flower2, Save, X, Sparkles, LoaderCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SLIDERS = [
  {
    id: 'sweetness',
    label: '甘さ',
    labelEn: 'Sweetness',
    emoji: '🍭',
    color: 'from-pink-300 to-rose-400',
    fillColor: '#f9a8d4',
    tags: ['core', 'impression'],
    levels: ['ドライ', 'ややドライ', '中庸', 'やや甘い', '甘い'],
  },
  {
    id: 'heaviness',
    label: '重さ',
    labelEn: 'Heaviness',
    emoji: '⚖️',
    color: 'from-amber-400 to-orange-500',
    fillColor: '#fbbf24',
    tags: ['core', 'impression'],
    levels: ['軽い', 'やや軽い', '中庸', 'やや重い', '重い'],
  },
  {
    id: 'persistence',
    label: '持続性',
    labelEn: 'Persistence',
    emoji: '⏳',
    color: 'from-violet-400 to-indigo-500',
    fillColor: '#a78bfa',
    tags: ['core', 'performance'],
    levels: ['短い', 'やや短い', '中庸', 'やや長い', '長い'],
  },
  {
    id: 'floral',
    label: 'フローラル度',
    labelEn: 'Floral',
    emoji: '🌸',
    color: 'from-fuchsia-300 to-pink-500',
    fillColor: '#f0abfc',
    tags: ['core', 'impression'],
    levels: ['控えめ', '弱め', '中庸', 'やや強い', '強い'],
  },
  {
    id: 'freshness',
    label: 'フレッシュ度',
    labelEn: 'Freshness',
    emoji: '🌿',
    color: 'from-emerald-300 to-teal-500',
    fillColor: '#6ee7b7',
    tags: ['core', 'impression'],
    levels: ['落ち着く', 'やや落ち着く', '中庸', 'やや爽やか', '爽やか'],
  },
  {
    id: 'citrus',
    label: 'シトラス感',
    labelEn: 'Citrus',
    emoji: '🍋',
    color: 'from-lime-300 to-yellow-400',
    fillColor: '#bef264',
    tags: ['impression'],
    levels: ['なし', 'ごく弱い', '中庸', 'やや強い', '強い'],
  },
  {
    id: 'woody',
    label: 'ウッディ感',
    labelEn: 'Woody',
    emoji: '🪵',
    color: 'from-orange-300 to-amber-500',
    fillColor: '#fdba74',
    tags: ['impression'],
    levels: ['なし', 'ごく弱い', '中庸', 'やや強い', '強い'],
  },
  {
    id: 'spicy',
    label: 'スパイシー感',
    labelEn: 'Spicy',
    emoji: '🌶️',
    color: 'from-red-300 to-orange-500',
    fillColor: '#fca5a5',
    tags: ['impression', 'performance'],
    levels: ['なし', 'ごく弱い', '中庸', 'やや強い', '強い'],
  },
];

const DISPLAY_MODES = [
  { id: 'core', label: '基本5項目' },
  { id: 'impression', label: '香調寄り' },
  { id: 'performance', label: '持続・拡張' },
  { id: 'all', label: 'すべて表示' },
];

const DEFAULT_VALUES = Object.fromEntries(SLIDERS.map((s) => [s.id, 5]));

const pickLevel = (slider, value) => {
  const idx = Math.min(4, Math.max(0, Math.floor((value - 1) / 2)));
  return slider.levels[idx];
};

export default function FragranceForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [displayMode, setDisplayMode] = useState('core');
  const fileInputRef = useRef(null);

  const displayedSliders = useMemo(() => {
    if (displayMode === 'all') return SLIDERS;
    return SLIDERS.filter((slider) => slider.tags.includes(displayMode));
  }, [displayMode]);

  const extractNameFromImage = async (file, overwrite = false) => {
    setExtractError('');
    setIsExtracting(true);
    try {
      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(`${API_BASE}/api/extract-name`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'ラベル解析に失敗しました');
      }

      setName((prev) => {
        if (!overwrite && prev.trim()) return prev;
        return data.name || prev;
      });
    } catch (err) {
      setExtractError(err.message || 'ラベル解析に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageChange = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    await extractNameFromImage(file, false);
  };

  const handleFileInput = async (e) => {
    await handleImageChange(e.target.files[0]);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await handleImageChange(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExtractError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSlider = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: Number(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('ratings_json', JSON.stringify(values));
      if (imageFile) fd.append('image', imageFile);

      const res = await fetch(`${API_BASE}/api/fragrances`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || '保存に失敗しました');
      }

      if (onSubmit) onSubmit(data);
      alert(`「${name.trim()}」を保存しました！`);
      setName('');
      clearImage();
      setValues(DEFAULT_VALUES);
    } catch (err) {
      alert(err.message || '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-400 to-purple-500 px-6 py-5 flex items-center gap-3">
        <Flower2 className="text-white w-7 h-7 flex-shrink-0" />
        <div>
          <h1 className="text-white text-xl font-bold leading-tight">香料ナレッジ入力</h1>
          <p className="text-rose-100 text-xs mt-0.5">Fragrance Knowledge Base</p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Fragrance name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              香料名 <span className="text-rose-500">*</span>
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={() => extractNameFromImage(imageFile, true)}
                disabled={isExtracting}
                className="text-xs inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                {isExtracting ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                写真から再抽出
              </button>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）ジャスミン・アブソリュート"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
          {isExtracting && <p className="text-xs text-indigo-500 mt-1">ラベルを解析中です...</p>}
          {extractError && <p className="text-xs text-rose-500 mt-1">{extractError}</p>}
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            画像アップロード
          </label>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={imagePreview}
                alt="プレビュー"
                className="w-full max-h-56 object-contain"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-600 hover:text-rose-500 rounded-full p-1 shadow transition"
                aria-label="画像を削除"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-gray-500 px-3 py-1.5 truncate">{imageFile?.name}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition ${
                isDragging
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {isDragging ? (
                <ImageIcon className="w-8 h-8 text-purple-400" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <p className="text-sm text-gray-500">
                クリックまたはドラッグ＆ドロップで画像を追加
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP 対応</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* Rating sliders */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">評価スライダー</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DISPLAY_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  displayMode === mode.id
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mb-2">
            表示を切り替えても、全項目の値は保持され保存されます。
          </p>
          <div className="space-y-4">
            {displayedSliders.map((slider) => (
              <SliderRow
                key={slider.id}
                slider={slider}
                value={values[slider.id]}
                onChange={handleSlider}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || isSaving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-400 to-purple-500 hover:from-rose-500 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition shadow-md"
        >
          {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  );
}

function SliderRow({ slider, value, onChange }) {
  const percent = ((value - 1) / 9) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700 flex items-center gap-1">
          <span>{slider.emoji}</span>
          <span className="font-medium">{slider.label}</span>
          <span className="text-gray-400 text-xs ml-1">{slider.labelEn}</span>
        </span>
        <span
          className={`text-sm font-bold w-8 text-center rounded-lg bg-gradient-to-r ${slider.color} bg-clip-text text-transparent`}
        >
          {value}
        </span>
      </div>

      <p className="text-[11px] text-gray-500 mb-1">{pickLevel(slider, value)}</p>

      <div className="relative px-1">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(slider.id, e.target.value)}
          className="ruler-slider w-full appearance-none cursor-pointer"
          style={{
            '--slider-fill': slider.fillColor,
            '--slider-progress': `${percent}%`,
          }}
        />
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="w-4 text-center">
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
