import { formatCurrency } from '../../utils/formatters'
import { useDragReorder } from '../../hooks/useDragReorder'
import DragHandle from '../layout/DragHandle'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

export default function AssetsPanel({ assets, onChange }) {
  const { dragHandleProps, getItemProps, draggingId, overedId } = useDragReorder(assets, onChange)

  function updateAsset(id, field, val) {
    onChange(assets.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  function deleteAsset(id) {
    onChange(assets.filter(a => a.id !== id))
  }

  function addAsset() {
    onChange([...assets, { id: Date.now(), name: 'New Asset', estimatedValue: 0, includedInWhatIf: false }])
  }

  const includedTotal = assets
    .filter(a => a.includedInWhatIf)
    .reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0)

  const grandTotal = assets
    .reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0)

  return (
    <div className="space-y-3">
      {assets.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">
          No assets yet. Add things like a car, electronics, collectibles, or investments you could sell.
        </p>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="grid items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold px-1"
            style={{ gridTemplateColumns: '20px 1fr 130px 90px 32px' }}
          >
            <span></span>
            <span>Asset</span>
            <span>Est. Value</span>
            <span className="text-center">Sell?</span>
            <span></span>
          </div>

          {/* Asset rows */}
          <div className="space-y-2">
            {assets.map(asset => (
              <div
                key={asset.id}
                className={`grid items-center gap-2 rounded-lg p-1 -m-1 transition-all ${
                  asset.includedInWhatIf ? 'bg-violet-950/20' : ''
                } ${draggingId === asset.id ? 'opacity-40' : ''} ${
                  overedId === asset.id && draggingId !== asset.id
                    ? 'ring-2 ring-violet-500/50 ring-inset'
                    : ''
                }`}
                style={{ gridTemplateColumns: '20px 1fr 130px 90px 32px' }}
                {...getItemProps(asset.id)}
              >
                <div
                  className="text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center select-none"
                  {...dragHandleProps(asset.id)}
                >
                  <DragHandle />
                </div>
                <input
                  type="text"
                  value={asset.name}
                  onChange={e => updateAsset(asset.id, 'name', e.target.value)}
                  className={`bg-gray-700 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none w-full transition-colors ${
                    asset.includedInWhatIf
                      ? 'border-violet-600/60 focus:border-violet-400'
                      : 'border-gray-600 focus:border-blue-500'
                  }`}
                  placeholder="e.g. Car, Guitar, Stocks"
                />
                <div className={`flex items-center bg-gray-700 border rounded-lg px-2 py-2 transition-colors ${
                  asset.includedInWhatIf
                    ? 'border-violet-600/60 focus-within:border-violet-400'
                    : 'border-gray-600 focus-within:border-blue-500'
                }`}>
                  <span className="text-gray-500 text-sm mr-1">$</span>
                  <input
                    type="number"
                    value={asset.estimatedValue}
                    onChange={e => updateAsset(asset.id, 'estimatedValue', Number(e.target.value))}
                    className="bg-transparent text-white text-sm w-full outline-none"
                    min="0"
                    step="100"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => updateAsset(asset.id, 'includedInWhatIf', !asset.includedInWhatIf)}
                    title={asset.includedInWhatIf ? 'Remove from what-if' : 'Include in what-if (sell this)'}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                      asset.includedInWhatIf
                        ? 'bg-violet-600/40 text-violet-300 border border-violet-500/60 shadow-sm shadow-violet-900'
                        : 'bg-gray-700 text-gray-500 border border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {asset.includedInWhatIf ? '✓ Sell' : 'Keep'}
                  </button>
                </div>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
                  title="Remove asset"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={addAsset}
        className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-violet-500 hover:text-violet-400 text-sm transition-colors"
      >
        + Add Asset
      </button>

      {assets.length > 0 && (
        <div className="bg-gray-700/40 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total asset value: </span>
            <span className="text-white font-semibold">{formatCurrency(grandTotal)}</span>
          </div>
          {includedTotal > 0 && (
            <div>
              <span className="text-gray-500">Marked to sell: </span>
              <span className="text-violet-300 font-semibold">{formatCurrency(includedTotal)}</span>
              <span className="text-gray-600 text-xs ml-1">(shown in what-if)</span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600">
        Toggle <span className="text-violet-400 font-medium">Sell</span> to include in What-If. Drag <span className="text-gray-500">⠿</span> to reorder.
      </p>
    </div>
  )
}
