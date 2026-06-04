import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, getDocs, db, doc, setDoc, deleteDoc } from "../firebase/firestore";

import redDeadCover from '../assets/images/redDeadCover.jpg'
import noGameBackground from '../assets/images/noGameBackground.svg'
import loadingGif from '../assets/images/loading.gif'

import '../styles/manageLibrary.css'

export default function ManageLibrary() {
    const [stats, setStats] = useState({
        total: 0,
        backlog: 0,
        completed: 0,
        playing: 0,
        custom: 0,
    });

    const [libInfo, setLibInfo] = useState([])
    const [groups, setGroups] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedGroupIds, setSelectedGroupIds] = useState([])
    const [statusFilter, setStatusFilter] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedGames, setSelectedGames] = useState([])
    const [pagnOpen, setPagnOpen] = useState(false)
    const [sortBy, setSortBy] = useState("")
    const [sheetOpen, setSheetOpen] = useState(false)

    function closeSheet() {
        setSheetOpen(false)
        setGroupTriggerOpen(false)
    }
    const [groupTriggerOpen, setGroupTriggerOpen] = useState(false)
    const [desktopGroupTriggerOpen, setDesktopGroupTriggerOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState("")
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 765)
    const [addToGroupModalOpen, setAddToGroupModalOpen] = useState(false)
    const [addToGroupSelected, setAddToGroupSelected] = useState("")
    const [isApplying, setIsApplying] = useState(false)
    const [groupRemovalModalOpen, setGroupRemovalModalOpen] = useState(false)
    const [groupRemovalSelected, setGroupRemovalSelected] = useState("")

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= 765)
        window.addEventListener("resize", handler)
        return () => window.removeEventListener("resize", handler)
    }, [])

    async function handleApply(overrideAction) {
        const action = overrideAction || bulkAction
        if (!action || selectedGames.length === 0) return
        if (action === "add-to-group") {
            setAddToGroupModalOpen(true)
            return
        }

        if (action === "remove-from-group") {
            if (selectedGames.length === 0) return
            setGroupRemovalModalOpen(true)
            return
        }
        const user = getAuth().currentUser
        if (!user) return

        setIsApplying(true)
        try {
            if (action === "complete") {
                await Promise.all(selectedGames.map(async (game) => {
                    const docId = String(game.id)
                    const completedRef = doc(db, "users", user.uid, "completed", docId)
                    const libraryRef = doc(db, "users", user.uid, "library", docId)
                    const completedAt = new Date().toISOString()
                    await Promise.all([
                        setDoc(completedRef, {
                            ...game,
                            status: "completed",
                            completedAt,
                        }),
                        setDoc(libraryRef, {
                            ...game,
                            inLibrary: true,
                            status: "completed",
                            completedAt,
                        }),
                    ])
                }))
            }

            if (action === "remove") {
                const removedIds = new Set(selectedGames.map((g) => String(g.id)))

                await Promise.all(selectedGames.map(async (game) => {
                    const docId = String(game.id)
                    await Promise.all([
                        deleteDoc(doc(db, "users", user.uid, "library", docId)),
                        deleteDoc(doc(db, "users", user.uid, "completed", docId)),
                    ])
                }))

                const affectedGroups = groups.filter((g) =>
                    g.gameIds?.some((id) => removedIds.has(String(id)))
                )

                await Promise.all(affectedGroups.map(async (g) => {
                    const updatedIds = g.gameIds.filter((id) => !removedIds.has(String(id)))
                    await setDoc(
                        doc(db, "users", user.uid, "groups", g.id),
                        { gameIds: updatedIds },
                        { merge: true }
                    )
                }))

                setGroups((prev) =>
                    prev.map((g) => ({
                        ...g,
                        gameIds: (g.gameIds || []).filter((id) => !removedIds.has(String(id))),
                    }))
                )
                setCurrentPage(1)
            }

            if (action === "unmark") {
                await Promise.all(selectedGames.map(async (game) => {
                    const docId = String(game.id)
                    const libraryRef = doc(db, "users", user.uid, "library", docId)
                    const completedRef = doc(db, "users", user.uid, "completed", docId)
                    await setDoc(libraryRef, {
                        ...game,
                        inLibrary: true,
                        status: "backlog",
                        completedAt: null,
                    })
                    await deleteDoc(completedRef)
                }))
            }

            setSelectedGames([])
            setBulkAction("")
            await loadLibrary()
        } finally {
            setIsApplying(false)
        }
    }

    async function handleRemoveFromGroup() {
        if (!groupRemovalSelected || selectedGames.length === 0) return
        const user = getAuth().currentUser
        if (!user) return

        const group = groups.find((g) => g.id === groupRemovalSelected)
        if (!group) return

        const removedIds = new Set(selectedGames.map((g) => String(g.id)))
        const updatedIds = (group.gameIds || []).filter((id) => !removedIds.has(String(id)))

        setIsApplying(true)
        try {
            await setDoc(
                doc(db, "users", user.uid, "groups", groupRemovalSelected),
                { gameIds: updatedIds },
                { merge: true }
            )

            setGroups((prev) =>
                prev.map((g) =>
                    g.id === groupRemovalSelected ? { ...g, gameIds: updatedIds } : g
                )
            )

            setGroupRemovalModalOpen(false)
            setGroupRemovalSelected("")
            setSelectedGames([])
            setBulkAction("")
        } finally {
            setIsApplying(false)
        }
    }

    async function handleAddToGroup() {
        if (!addToGroupSelected || selectedGames.length === 0) return
        const user = getAuth().currentUser
        if (!user) return

        const group = groups.find((g) => g.id === addToGroupSelected)
        if (!group) return

        const existingIds = new Set(group.gameIds || [])
        const newIds = selectedGames
            .map((g) => String(g.id))
            .filter((id) => !existingIds.has(id))

        const updatedIds = [...(group.gameIds || []), ...newIds]

        await setDoc(
            doc(db, "users", user.uid, "groups", addToGroupSelected),
            { gameIds: updatedIds },
            { merge: true }
        )

        setGroups((prev) =>
            prev.map((g) =>
                g.id === addToGroupSelected
                    ? { ...g, gameIds: updatedIds }
                    : g
            )
        )

        setAddToGroupModalOpen(false)
        setAddToGroupSelected("")
        setSelectedGames([])
        setBulkAction("")
    }

    function handleGameSelect(game) {
        setSelectedGames((prev) => {
            const exists = prev.some((g) => g.id === game.id)
            const next = exists ? prev.filter((g) => g.id !== game.id) : [...prev, game]
            console.log("selectedGames:", next)
            return next
        })
    }
    const GAMES_PER_PAGE = 12

    const allGroupedIds = new Set(groups.flatMap((g) => g.gameIds?.map(String) || []))

    function toggleGroupId(id) {
        setSelectedGroupIds((prev) => {
            if (id === "") return []
            return prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
        })
        setCurrentPage(1)
    }

    const groupFilteredGames = selectedGroupIds.length === 0
        ? libInfo
        : selectedGroupIds.includes("__ungrouped__") && selectedGroupIds.length === 1
            ? libInfo.filter((game) => !allGroupedIds.has(String(game.id)))
            : libInfo.filter((game) => {
                return selectedGroupIds.some((id) => {
                    if (id === "__ungrouped__") return !allGroupedIds.has(String(game.id))
                    const group = groups.find((g) => g.id === id)
                    return group?.gameIds?.includes(String(game.id))
                })
            })

    const filteredGames = groupFilteredGames
        .filter((game) => {
            if (statusFilter === "all") return true
            return game.status === statusFilter
        })
        .filter((game) => {
            if (!searchTerm.trim()) return true
            return game.title?.toLowerCase().includes(searchTerm.toLowerCase())
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "name-az": return (a.title || "").localeCompare(b.title || "")
                case "name-za": return (b.title || "").localeCompare(a.title || "")
                case "meta-high": return (b.metacritic || 0) - (a.metacritic || 0)
                case "meta-low": return (a.metacritic || 0) - (b.metacritic || 0)
                case "added-new": return new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
                case "added-old": return new Date(a.addedAt || 0) - new Date(b.addedAt || 0)
                default: return 0
            }
        })

    const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE))

    const allSelected = filteredGames.length > 0 && filteredGames.every((g) => selectedGames.some((s) => s.id === g.id))

    const groupStats = {
        total: groupFilteredGames.length,
        backlog: groupFilteredGames.filter((g) => g.status === "backlog").length,
        completed: groupFilteredGames.filter((g) => g.status === "completed").length,
    }

    console.log(libInfo)
    useEffect(() => {
        console.log("games on page:", filteredGames.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE))
    }, [filteredGames, currentPage])

    async function loadLibrary() {
        const user = getAuth().currentUser;
        if (!user) return;

        const [librarySnap, completedSnap, groupsSnap] = await Promise.all([
            getDocs(collection(db, "users", user.uid, "library")),
            getDocs(collection(db, "users", user.uid, "completed")),
            getDocs(collection(db, "users", user.uid, "groups")),
        ]);

        const libraryDocs = librarySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const completedDocs = completedSnap.docs.map((d) => ({ id: d.id, status: "completed", ...d.data() }));
        const completedIds = new Set(completedDocs.map((g) => String(g.id)));
        const allDocs = [
            ...libraryDocs.filter((g) => !completedIds.has(String(g.id))),
            ...completedDocs,
        ];
        const completedCount = completedSnap.size;
        const backlogCount = libraryDocs.filter((g) => g.status === "backlog").length;
        const playingCount = libraryDocs.filter((g) => g.status === "playing").length;
        const customCount = allDocs.filter((g) => g.isCustom === true).length;
        const total = allDocs.length;

        setStats({ total, backlog: backlogCount, completed: completedCount, playing: playingCount, custom: customCount });
        setLibInfo(allDocs);
        setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }

    useEffect(() => {
        loadLibrary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <div className="manage-library-page">
            <div className="manage-library-page-wrapper">
                <section className="manage-library-title-row">
                    <div>
                        <span className="pre-header">Game Library</span>
                        <h1>Manage Library</h1>
                    </div>
                    <Link to="/library"><button>← Back to Library</button></Link>
                </section>
                <section className="library-stats">
                    <div><p>{stats.total}</p><span>Total Games</span></div>
                    <div><p>{stats.backlog}</p><span>Backlog</span></div>
                    <div><p>{stats.completed}</p><span>Completed</span></div>
                    <div><p>{stats.custom}</p><span>Custom</span></div>
                </section>
                <section className='manage-library-con'>
                    <div className='manage-library-top'>
                        <div className='quick-actions'>
                            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                                <option value="">Bulk Actions</option>
                                <option value="complete">Mark as Completed</option>
                                <option value="remove">Remove From Library</option>
                                <option value="unmark">Unmark as Complete</option>
                                <option value="add-to-group">Add to Group</option>
                                <option value="remove-from-group">Remove From Group</option>
                            </select>
                            <button onClick={() => handleApply()}>Apply</button>
                        </div>
                        <div className='library-buttons'>
                            <button className={statusFilter === "all" ? "active" : ""} onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All<span>{groupStats.total}</span></button>
                            <button className={statusFilter === "backlog" ? "active" : ""} onClick={() => { setStatusFilter("backlog"); setCurrentPage(1); }}>Backlog<span>{groupStats.backlog}</span></button>
                            <button className={statusFilter === "completed" ? "active" : ""} onClick={() => { setStatusFilter("completed"); setCurrentPage(1); }}>Complete<span>{groupStats.completed}</span></button>
                        </div>
                        <div className='library-search'>
                            <div className="search-con">
                                <svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"></circle><path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
                                <input type='text' placeholder='Search Library' value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}></input>
                            </div>
                            <button className='mobile-sort-button' onClick={() => setSheetOpen(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="11" y1="18" x2="13" y2="18"></line></svg><span style={{ display: (sortBy ? 1 : 0) + selectedGroupIds.length === 0 ? "none" : undefined }}>{(sortBy ? 1 : 0) + selectedGroupIds.length}</span></button>
                            {/* <select
                                multiple
                                value={selectedGroupIds}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                                    setSelectedGroupIds(selected.filter((v) => v !== ""))
                                    setCurrentPage(1)
                                }}
                                size={Math.min(groups.length + 2, 6)}
                            >
                                <option value="__ungrouped__">Ungrouped</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select> */}
                            <div className={`group-trigger-con${desktopGroupTriggerOpen ? " active" : ""}`}>
                                <div className="group-trigger" onClick={() => setDesktopGroupTriggerOpen((v) => !v)}>
                                    <p>{selectedGroupIds.length > 0 ? <>Selected Groups <span>{selectedGroupIds.length}</span></> : "All Groups"}</p>
                                </div>
                                <div className="group-options">
                                    <p
                                        className={selectedGroupIds.length === 0 ? "active" : ""}
                                        onClick={() => { setSelectedGroupIds([]); setCurrentPage(1); }}
                                    >All Groups</p>
                                    <p
                                        className={selectedGroupIds.includes("__ungrouped__") ? "active" : ""}
                                        onClick={() => toggleGroupId("__ungrouped__")}
                                    >Ungrouped</p>
                                    {groups.map((g) => (
                                        <p
                                            key={g.id}
                                            className={selectedGroupIds.includes(g.id) ? "active" : ""}
                                            onClick={() => toggleGroupId(g.id)}
                                        >{g.name}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="sort-by">
                            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                                <option value="">Sort By</option>
                                <option value="name-az">Name (A-Z)</option>
                                <option value="name-za">Name (Z-A)</option>
                                <option value="meta-high">Metacritic (High-Low)</option>
                                <option value="meta-low">Metacritic (Low-High)</option>
                                <option value="added-new">Date Added (Newest)</option>
                                <option value="added-old">Date Added (Oldest)</option>
                            </select>
                        </div>
                        <div className="mobile-sort-buttons-con" style={{ display: isMobile && selectedGames.length > 0 ? "block" : "none" }}>
                            <div className="mobile-sort-buttons-wrapper">
                                <p>Bulk Actions ({selectedGames.length} selected)</p>
                                <div>
                                    <button
                                        onClick={async () => { setBulkAction("complete"); await handleApply("complete"); }}
                                        disabled={selectedGames.length === 0}
                                    >Mark Complete</button>
                                    <button
                                        onClick={async () => { setBulkAction("remove"); await handleApply("remove"); }}
                                        disabled={selectedGames.length === 0}
                                    >Remove From Library</button>
                                    <button
                                        onClick={async () => { setBulkAction("unmark"); await handleApply("unmark"); }}
                                        disabled={selectedGames.length === 0}
                                    >Unmark as Complete</button>
                                    <button
                                        onClick={() => { if (selectedGames.length > 0) setAddToGroupModalOpen(true) }}
                                        disabled={selectedGames.length === 0}
                                    >Add to Group</button>
                                    <button
                                        onClick={() => { if (selectedGames.length > 0) setGroupRemovalModalOpen(true) }}
                                        disabled={selectedGames.length === 0}
                                    >Remove From Group</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='library-table-head'>
                        <div className='checkbox-con'>
                            <div
                                className={`checkbox ${allSelected ? "active" : ""}`}
                                onClick={() => {
                                    if (allSelected) {
                                        const filteredIds = new Set(filteredGames.map((g) => g.id))
                                        setSelectedGames((prev) => prev.filter((g) => !filteredIds.has(g.id)))
                                    } else {
                                        setSelectedGames((prev) => {
                                            const next = [...prev]
                                            filteredGames.forEach((g) => {
                                                if (!next.some((s) => s.id === g.id)) next.push(g)
                                            })
                                            return next
                                        })
                                    }
                                }}
                            />
                        </div>
                        <div className='game-details-con'>
                            <p>Title</p>
                        </div>
                        <div className='genre-con'>
                            <p>Genre</p>
                        </div>
                        <div className='status-con'>
                            <p>Status</p>
                        </div>
                        <div className='platform-con'>
                            <p>Platforms</p>
                        </div>
                        <div className='score'>
                            <p>Score</p>
                        </div>
                        <div className='added-con'>
                            <p>Added</p>
                        </div>
                        <div className='groups-con'>
                            <p>Groups</p>
                        </div>
                    </div>
                    <div className="library-games">
                        {filteredGames.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE).map((game) => (
                            <div className='library-table-game' key={game.id}>
                                <div className='checkbox-con'>
                                    <div
                                        className={`checkbox ${selectedGames.some((s) => s.id === game.id) ? "active" : ""}`}
                                        onClick={() => handleGameSelect(game)}
                                    />
                                </div>
                                <div className='game-details-con'>
                                    <img src={game.backgroundImage || game.background_image || game.coverImage || noGameBackground}></img>
                                    <Link to={`/game#${game.rawgId || game.id}`} className='game-details'>
                                        <p>{game.title}</p>
                                        <div>
                                            <span className={`mobile-status${game.status === "completed" ? " completed" : ""}`}>{game.status}</span>
                                            <span className="mobile-rating">{game.metacritic ?? "-"}</span>
                                            <span>{typeof game.genres?.[0] === "string" ? game.genres[0] : game.genres?.[0]?.name || "Unlisted"}</span>
                                        </div>
                                    </Link>
                                </div>
                                <div className='genre-con'>
                                    <p>{typeof game.genres?.[0] === "string" ? game.genres[0] : game.genres?.[0]?.name || "Unlisted"}</p>
                                </div>
                                <div className='status-con'>
                                    <p className={game.status === "completed" ? "status-completed" : ""}>{game.status}</p>
                                </div>
                                <div className='platform-con'>
                                    <select>
                                        {Array.isArray(game.platforms) && game.platforms.map((p, i) => (
                                            <option key={i}>{typeof p === "string" ? p : p.platform?.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className='score'>
                                    <p>{game.metacritic ?? "-"}</p>
                                </div>
                                <div className='added-con'>
                                    <p>{game.addedAt ? new Date(game.addedAt).toLocaleDateString() : "-"}</p>
                                </div>
                                <div className='groups-con'>
                                    <select>
                                        {groups.filter((g) => g.gameIds?.includes(String(game.id))).length === 0
                                            ? <option value="">Ungrouped</option>
                                            : groups
                                                .filter((g) => g.gameIds?.includes(String(game.id)))
                                                .map((g) => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))
                                        }
                                    </select>
                                </div>
                                <button className="mobile-options" onClick={() => setSheetOpen(true)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
                            </div>
                        ))}
                    </div>
                </section>
                <section className='library-table-bottom'>
                    <p>Jump to page <input type="number" value={currentPage} min={1} max={totalPages} onChange={(e) => { const val = Math.min(Math.max(1, Number(e.target.value)), totalPages); if (!isNaN(val)) setCurrentPage(val); }}></input> of {totalPages}</p>
                    <div className='library-table-pagination'>
                        <button
                            disabled={currentPage === 1}
                            style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >Prev</button>
                        <div className='pagn-con'>
                            <button className={`pagn-trigger${pagnOpen ? " active" : ""}`} onClick={() => setPagnOpen((v) => !v)}>
                                Page <span>{currentPage}</span> of <span>{totalPages}</span>
                            </button>
                            <div className='pagn-options' style={{ display: pagnOpen ? undefined : "none" }}>
                                {(() => {
                                    const half = 3
                                    let start = Math.max(1, currentPage - half)
                                    let end = Math.min(totalPages, start + 5)
                                    if (end - start < 5) start = Math.max(1, end - 5)
                                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
                                        <button
                                            key={p}
                                            className={p === currentPage ? "active" : ""}
                                            onClick={() => { setCurrentPage(p); setPagnOpen(false); }}
                                        >{p}</button>
                                    ))
                                })()}
                            </div>
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >Next</button>
                    </div>
                </section>
            </div>
            <div className="add-to-group-modal-con" style={{ opacity: addToGroupModalOpen ? 1 : 0, pointerEvents: addToGroupModalOpen ? "all" : "none" }}>
                <div className="add-to-group-modal">
                    <button onClick={() => { setAddToGroupModalOpen(false); setAddToGroupSelected(""); }}>✕</button>
                     <h3>Which group would you like to add the selected games to?</h3>
                     <select value={addToGroupSelected} onChange={(e) => setAddToGroupSelected(e.target.value)}>
                        <option value="">Select A Group</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <button
                        className={!addToGroupSelected ? "disabled" : ""}
                        onClick={handleAddToGroup}
                        disabled={!addToGroupSelected || selectedGames.length === 0}
                    >Add to Group</button>
                </div>
            </div>
            <div className="loading-action-modal-con" style={{ opacity: isApplying ? 1 : 0, pointerEvents: isApplying ? "all" : "none" }}>
                <div className="loading-action-modal">
                    <img src={loadingGif} alt="Loading" />
                    <h3>Action in Progress</h3>
                </div>
            </div>
            <div className="group-removal-modal-con" style={{ opacity: groupRemovalModalOpen ? 1 : 0, pointerEvents: groupRemovalModalOpen ? "all" : "none" }}>
                <div className="group-removal-modal">
                    <button onClick={() => { setGroupRemovalModalOpen(false); setGroupRemovalSelected(""); }}>✕</button>
                    <h3>Which group would you like to remove the selected games from?</h3>
                    <select value={groupRemovalSelected} onChange={(e) => setGroupRemovalSelected(e.target.value)}>
                        <option value="">Select a group...</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <button
                        className={!groupRemovalSelected ? "disabled" : ""}
                        onClick={handleRemoveFromGroup}
                        disabled={!groupRemovalSelected || selectedGames.length === 0}
                    >Remove From Group</button>
                </div>
            </div>
            <div className="mobile-hidden-menu" style={{ opacity: sheetOpen ? 1 : 0, pointerEvents: sheetOpen ? "all" : "none" }} onClick={() => closeSheet()}>
                <div className="mobile-hidden-menu-wrapper" style={{ transform: sheetOpen ? "translate(-50%, -25%)" : "translate(-50%, 100%)" }} onClick={(e) => e.stopPropagation()}>
                    <div className="sheet-handle-wrapper">
                        <div className="sheet-handle" onClick={() => closeSheet()}></div>
                    </div>
                    <div className="sort-options">
                        <div className="title">
                            <p>Sort & Filter</p>
                        </div>
                        <div className="option-group">
                            <span>Sort By</span>
                            <div className="options-wrapper">
                                <button className={sortBy === "name-az" ? "active" : ""} onClick={() => { setSortBy("name-az"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="9" y2="18"></line></svg>
                                        </div>
                                        <p>Title A-Z</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "name-az" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                                <button className={sortBy === "name-za" ? "active" : ""} onClick={() => { setSortBy("name-za"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="9" y2="18"></line></svg>
                                        </div>
                                        <p>Title Z-A</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "name-za" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                                <button className={sortBy === "meta-high" ? "active" : ""} onClick={() => { setSortBy("meta-high"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        </div>
                                        <p>Metacritic (High–Low)</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "meta-high" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                                <button className={sortBy === "meta-low" ? "active" : ""} onClick={() => { setSortBy("meta-low"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        </div>
                                        <p>Metacritic (Low–High)</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "meta-low" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                                <button className={sortBy === "added-new" ? "active" : ""} onClick={() => { setSortBy("added-new"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                        <p>Date Added (Newest)</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "added-new" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                                <button className={sortBy === "added-old" ? "active" : ""} onClick={() => { setSortBy("added-old"); setCurrentPage(1); }}>
                                    <div>
                                        <div className="icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                        <p>Date Added (Oldest)</p>
                                    </div>
                                    <div className="enabled-sym" style={{ visibility: sortBy === "added-old" ? "visible" : "hidden" }}>
                                        <span>✓</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div className="option-group">
                            <span>Groups</span>
                            <div className={`group-trigger-con${groupTriggerOpen ? " active" : ""}`}>
                                <div className="group-trigger" onClick={() => setGroupTriggerOpen((v) => !v)}>
                                    <p>{selectedGroupIds.length > 0 ? <>Selected Groups <span>{selectedGroupIds.length}</span></> : "All Groups"}</p>
                                </div>
                                <div className="group-options">
                                    <p
                                        className={selectedGroupIds.length === 0 ? "active" : ""}
                                        onClick={() => { setSelectedGroupIds([]); setCurrentPage(1); }}
                                    >All Groups</p>
                                    <p
                                        className={selectedGroupIds.includes("__ungrouped__") ? "active" : ""}
                                        onClick={() => toggleGroupId("__ungrouped__")}
                                    >Ungrouped</p>
                                    {groups.map((g) => (
                                        <p
                                            key={g.id}
                                            className={selectedGroupIds.includes(g.id) ? "active" : ""}
                                            onClick={() => toggleGroupId(g.id)}
                                        >{g.name}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
