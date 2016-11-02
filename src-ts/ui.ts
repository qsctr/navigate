'use strict';

onerror = alert;

(() => {

    const qs: typeof document.querySelector = document.querySelector.bind(document);
    const qsa: typeof document.querySelectorAll = document.querySelectorAll.bind(document);

    const introScreen = qs('#intro-screen') as HTMLElement;
    const queryButton = qs('#query-button') as HTMLButtonElement;
    const areaTooBig = qs('#area-too-big-warning') as HTMLElement;
    const queryingScreen = qs('#querying-screen') as HTMLElement;
    const chooseScreen = qs('#choose-screen') as HTMLElement;
    const nodesCreatedElem = qs('#nodes-created');
    const startNodeIdElem = qs('#start-node-id');
    const goalNodeIdElem = qs('#goal-node-id');
    const searchButton = qs('#search-button') as HTMLButtonElement;
    const resultsScreen = qs('#results-screen') as HTMLElement;
    const pathResult = qs('#path-result');
    const expandedResult = qs('#expanded-result');
    const fringeResult = qs('#fringe-result');
    const backButton = qs('#back-button') as HTMLButtonElement;

    const sidebarItems = Array.prototype.slice.call(qsa('#sidebar > *')) as HTMLElement[];

    const colors = {
        default: '#3388ff',
        start: 'red',
        goal: 'green',
        expanded: 'darkblue',
        path: '#009688',
        fringe: 'orange'
    };

    let map: L.Map;

    let startNode: GraphNode | null = null;
    let goalNode: GraphNode | null = null;
    let searchFunction: SearchFunction;

    queryButton.addEventListener('click', query);
    searchButton.addEventListener('click', search);

    const radioToFunction: { [id: string]: SearchFunction } = {
        'uniform-cost-radio': uniformCostSearch,
        'greedy-radio': greedySearch,
        'a-star-radio': aStarSearch
    };
    for (const id in radioToFunction) {
        document.querySelector('#' + id).addEventListener('click', () => {
            searchFunction = radioToFunction[id];
            checkSearchButton();
        });
    }

    backButton.addEventListener('click', chooseAgain);

    const nodeIdToCircle = new Map<number, L.Circle>();

    let pathLine: L.Polyline | null = null;

    navigator.geolocation.getCurrentPosition(
        pos => init(pos.coords.latitude, pos.coords.longitude),
        () => init(25.116035, 121.529946) // fallback to TAS
    );

    function init(lat: number, lng: number) {

        map = L.map('map', {
            center: [lat, lng],
            zoom: 17,
            worldCopyJump: true
        });

        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 21,
            maxNativeZoom: 19
        }).addTo(map);

        map.on('zoom', () => {
            if (map.getZoom() < 13) {
                queryButton.disabled = true;
                showElem(areaTooBig);
            } else {
                queryButton.disabled = false;
                hideElem(areaTooBig);
            }
        });

        showOnly(introScreen);

    }

    function query() {

        showOnly(queryingScreen);

        const bounds = map.getBounds();
        const overpassQL = `[out:json];way[highway](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});out geom;`;

        fetch('https://overpass-api.de/api/interpreter?data=' + overpassQL)
            .then(res => res.json())
            .then(createNodes);

    }

    function createNodes(data: OverpassJSON) {

        const nodes = overpassToGraphNodes(data);

        for (const node of nodes) {

            const circle = L.circle(node, {
                radius: 6,
                stroke: false,
                fillOpacity: 0.7,
                color: colors.default
            }).bindPopup(() => {

                const elem = document.createElement('div');

                const id = document.createElement('div');
                id.textContent = node.id.toString();
                elem.appendChild(id);

                const startLink = document.createElement('a');
                startLink.href = '#';
                startLink.textContent = 'Set as start';
                startLink.addEventListener('click', () => {
                    if (node === goalNode) {
                        goalNode = null;
                        goalNodeIdElem.textContent = '';
                        (nodeIdToCircle.get(node.id) as L.Circle).setStyle({
                            color: colors.default
                        });
                    }
                    if (startNode !== null) {
                        (nodeIdToCircle.get(startNode.id) as L.Circle).setStyle({
                            color: colors.default
                        });
                    }
                    startNode = node;
                    startNodeIdElem.textContent = startNode.id.toString();
                    checkSearchButton();
                    circle.closePopup();
                    (circle as L.Circle).setStyle({
                        color: colors.start
                    });
                });
                elem.appendChild(startLink);

                elem.appendChild(document.createElement('br'));

                const goalLink = document.createElement('a');
                goalLink.href = '#';
                goalLink.textContent = 'Set as goal';
                goalLink.addEventListener('click', () => {
                    if (node === startNode) {
                        startNode = null;
                        startNodeIdElem.textContent = '';
                        (nodeIdToCircle.get(node.id) as L.Circle).setStyle({
                            color: colors.default
                        });
                    }
                    if (goalNode !== null) {
                        (nodeIdToCircle.get(goalNode.id) as L.Circle).setStyle({
                            color: colors.default
                        });
                    }
                    goalNode = node;
                    goalNodeIdElem.textContent = goalNode.id.toString();
                    checkSearchButton();
                    circle.closePopup();
                    (circle as L.Circle).setStyle({
                        color: colors.goal
                    });
                });
                elem.appendChild(goalLink);

                return elem;

            }).addTo(map);

            nodeIdToCircle.set(node.id, circle);

        }

        nodesCreatedElem.textContent = nodes.length.toString();

        showOnly(chooseScreen);

    }

    function search() {

        const { expanded, path, fringe } =
            searchFunction(startNode as GraphNode, goalNode as GraphNode);

        expandedResult.textContent = expanded.length.toString();
        for (const exp of expanded) {
            if (exp !== startNode && exp !== goalNode) {
                (nodeIdToCircle.get(exp.id) as L.Circle).setStyle({
                    color: colors.expanded
                });
            }
        }

        if (path === undefined) {
            pathResult.textContent = 'Path not found.';
        } else {
            pathResult.textContent = `Path found with ${path.length} nodes.`;
            pathLine = L.polyline(path, {
                weight: 8,
                color: colors.path
            }).addTo(map);
        }

        if (fringe === undefined) {
            fringeResult.textContent = 'No';
        } else {
            fringeResult.textContent = fringe.length.toString();
            while (fringe.length > 0) {
                (nodeIdToCircle.get(fringe.dequeue().id) as L.Circle).setStyle({
                    color: colors.fringe
                });
            }
        }

        showOnly(resultsScreen);

    }

    function chooseAgain() {

        for (const [id, circle] of nodeIdToCircle.entries()) {
            if (id !== (startNode as GraphNode).id && id !== (goalNode as GraphNode).id) {
                circle.setStyle({
                    color: colors.default
                });
            }
        }

        if (pathLine !== null) {
            pathLine.remove();
            pathLine = null;
        }

        showOnly(chooseScreen);

    }

    function checkSearchButton() {
        searchButton.disabled = !(startNode && goalNode && searchFunction);
    }

    function showOnly(elem: HTMLElement) {
        for (const item of sidebarItems) {
            hideElem(item);
        }
        showElem(elem);
    }

    function showElem(elem: HTMLElement) {
        elem.style.display = 'block';
    }
    
    function hideElem(elem: HTMLElement) {
        elem.style.display = 'none';
    }

})();