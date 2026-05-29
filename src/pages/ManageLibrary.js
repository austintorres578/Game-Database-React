import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, getDocs, db, doc, setDoc, deleteDoc } from "../firebase/firestore";

import redDeadCover from '../assets/images/redDeadCover.jpg'
import noGameBackground from '../assets/images/noGameBackground.svg'

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
    const [selectedGroupId, setSelectedGroupId] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedGames, setSelectedGames] = useState([])
    const [pagnOpen, setPagnOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState("")

    async function handleApply() {
        if (bulkAction !== "complete" || selectedGames.length === 0) return
        const user = getAuth().currentUser
        if (!user) return

        await Promise.all(selectedGames.map(async (game) => {
            const docId = String(game.id)
            const completedRef = doc(db, "users", user.uid, "completed", docId)
            const libraryRef = doc(db, "users", user.uid, "library", docId)
            await setDoc(completedRef, {
                ...game,
                inLibrary: false,
                status: "completed",
                completedAt: new Date().toISOString(),
            })
            await deleteDoc(libraryRef)
        }))

        setSelectedGames([])
        await loadLibrary()
    }

    function handleGameSelect(game) {
        setSelectedGames((prev) => {
            const exists = prev.some((g) => g.id === game.id)
            const next = exists ? prev.filter((g) => g.id !== game.id) : [...prev, game]
            console.log("selectedGames:", next)
            return next
        })
    }
    const GAMES_PER_PAGE = 10

    const allGroupedIds = new Set(groups.flatMap((g) => g.gameIds?.map(String) || []))

    const groupFilteredGames = selectedGroupId === "__ungrouped__"
        ? libInfo.filter((game) => !allGroupedIds.has(String(game.id)))
        : selectedGroupId
            ? libInfo.filter((game) => {
                const group = groups.find((g) => g.id === selectedGroupId)
                return group?.gameIds?.includes(String(game.id))
            })
            : libInfo

    const filteredGames = groupFilteredGames
        .filter((game) => {
            if (statusFilter === "all") return true
            return game.status === statusFilter
        })
        .filter((game) => {
            if (!searchTerm.trim()) return true
            return game.title?.toLowerCase().includes(searchTerm.toLowerCase())
        })

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
                    <button>Back to Library</button>
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
                            </select>
                            <button onClick={handleApply}>Apply</button>
                        </div>
                        <div className='library-buttons'>
                            <button className={statusFilter === "all" ? "active" : ""} onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>All<span>{groupStats.total}</span></button>
                            <button className={statusFilter === "backlog" ? "active" : ""} onClick={() => { setStatusFilter("backlog"); setCurrentPage(1); }}>Backlog<span>{groupStats.backlog}</span></button>
                            <button className={statusFilter === "completed" ? "active" : ""} onClick={() => { setStatusFilter("completed"); setCurrentPage(1); }}>Complete<span>{groupStats.completed}</span></button>
                        </div>
                        <div className='library-search'>
                            <input type='text' placeholder='Search Library' value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}></input>
                            <select value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); setCurrentPage(1); }}>
                                <option value="">All Groups</option>
                                <option value="__ungrouped__">Ungrouped</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className='library-table-head'>
                        <div className='checkbox-con'>
                            <input
                                type='checkbox'
                                checked={filteredGames.length > 0 && filteredGames.every((g) => selectedGames.some((s) => s.id === g.id))}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedGames((prev) => {
                                            const next = [...prev]
                                            filteredGames.forEach((g) => {
                                                if (!next.some((s) => s.id === g.id)) next.push(g)
                                            })
                                            console.log("selectedGames:", next)
                                            return next
                                        })
                                    } else {
                                        const filteredIds = new Set(filteredGames.map((g) => g.id))
                                        setSelectedGames((prev) => {
                                            const next = prev.filter((g) => !filteredIds.has(g.id))
                                            console.log("selectedGames:", next)
                                            return next
                                        })
                                    }
                                }}
                            ></input>
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
                                    <input type='checkbox' checked={selectedGames.some((g) => g.id === game.id)} onChange={() => handleGameSelect(game)}></input>
                                </div>
                                <div className='game-details-con'>
                                    <img src={game.backgroundImage || game.background_image || game.coverImage || noGameBackground}></img>
                                    <Link to={`/game#${game.rawgId || game.id}`} className='game-details'>
                                        <p>{game.title}</p>
                                        <span>{typeof game.genres?.[0] === "string" ? game.genres[0] : game.genres?.[0]?.name || "Unlisted"}</span>
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
                                        {game.platforms?.map((p, i) => (
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
                            </div>
                        ))}
                    </div>
                </section>
                <section className='library-table-bottom'>
                    <p>Jump to page <input type="number" min={1} max={Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE))} onChange={(e) => { const val = Math.min(Math.max(1, Number(e.target.value)), Math.ceil(filteredGames.length / GAMES_PER_PAGE)); if (!isNaN(val)) setCurrentPage(val); }}></input> of {Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE))}</p>
                    <div className='library-table-pagination'>
                        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <div className='pagn-con'>
                            <button className={`pagn-trigger${pagnOpen ? " active" : ""}`} onClick={() => setPagnOpen((v) => !v)}>
                                Page <span>{currentPage}</span> of <span>{Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE))}</span>
                            </button>
                            <div className='pagn-options'>
                                <button>1</button>
                                <button>2</button>
                            </div>
                        </div>
                        <button onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredGames.length / GAMES_PER_PAGE), p + 1))}>Next</button>
                    </div>
                </section>
            </div>
        </div>
    )
}
