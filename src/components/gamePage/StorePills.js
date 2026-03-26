import {
  getStoreLabel,
  renderStorePrice,
} from "../../utils/gamePage/storeUtils";

export default function StorePills({ storesChecked, combinedStores }) {
  if (storesChecked && combinedStores.length === 0) {
    return <p>No store links found.</p>;
  }

  if (!storesChecked || !combinedStores.length) {
    return <p>Loading store links…</p>;
  }

  return (
    <div className="store-pills">
      {combinedStores.map((s, idx) => {
        const label = getStoreLabel(s);
        const url = s?.url;

        if (!url) return null;

        return (
          <div key={`${label}-${idx}-${url}`} className="store-pill-card">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="store-pill"
              title={label}
            >
              <span className="store-pill__name">{label}</span>
              {renderStorePrice(s)}
            </a>
          </div>
        );
      })}
    </div>
  );
}
