import { useState, useRef } from 'react';
import { Upload, ImageIcon, Flower2, Save, X } from 'lucide-react';

const SLIDERS = [
  { id: 'sweetness', label: '甘さ', labelEn: 'Sweetness', emoji: '🍭', color: 'from-pink-300 to-rose-400', fillColor: '#f9a8d4' },
  { id: 'heaviness', label: '重さ', labelEn: 'Heaviness', emoji: '⚖️', color: 'from-amber-400 to-orange-500', fillColor: '#fbbf24' },
  { id: 'persistence', label: '持続性', labelEn: 'Persistence', emoji: '⏳', color: 'from-purple-400 to-violet-500', fillColor: '#c084fc' },
  { id: 'floral', label: 'フローラル度', labelEn: 'Floral', emoji: '🌸', color: 'from-fuchsia-300 to-pink-500', fillColor: '#f0abfc' },
  { id: 'freshness', label: 'フレッシュ度', labelEn: 'Freshness', emoji: '🌿', color: 'from-emerald-300 to-teal-500', fillColor: '#6ee7b7' },
];

const DEFAULT_VALUES = Object.fromEntries(SLIDERS.map((s) => [s.id, 5]));

export default function FragranceForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    handleImageChange(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageChange(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSlider = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: Number(val) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), imageFile, ratings: values };
    if (onSubmit) onSubmit(payload);
    alert(`「${name.trim()}」を保存しました！`);
    setName('');
    clearImage();
    setValues(DEFAULT_VALUES);
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
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            香料名 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）ジャスミン・アブソリュート"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
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
          <div className="space-y-4">
            {SLIDERS.map((slider) => (
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
          disabled={!name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-400 to-purple-500 hover:from-rose-500 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition shadow-md"
        >
          <Save className="w-4 h-4" />
          保存する
        </button>
      </div>
    </form>
  );
}

function SliderRow({ slider, value, onChange }) {
  const percent = (value - 1) / 9;

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

      {/* Ruler-style track */}
      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(slider.id, e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500 bg-gray-100"
          style={{
            background: `linear-gradient(to right, ${slider.fillColor} ${percent * 100}%, #e5e7eb ${percent * 100}%)`,
          }}
        />
        {/* Tick marks */}
        <div className="flex justify-between px-0.5 mt-1">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="text-[10px] text-gray-400 w-4 text-center">
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
