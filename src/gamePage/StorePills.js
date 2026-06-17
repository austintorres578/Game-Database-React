import {
  getStoreLabel,
  renderStorePrice,
} from "../../utils/gamePage/storeUtils";

export default function StorePills({ storesChecked, combinedStores }) {
  if (!storesChecked) {
    return (
      <div className="store-pills">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="store-pill-card" key={`store-skeleton-${i}`}>
            <span className="store-pill store-pill-skeleton cover-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!combinedStores.length) {
    return <p>No store links found.</p>;
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
