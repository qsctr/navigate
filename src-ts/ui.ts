'use strict';

onerror = alert;

navigator.geolocation.getCurrentPosition(
    pos => init(pos.coords.latitude, pos.coords.longitude),
    () => init(25.116035, 121.529946) // fallback to TAS
);

function init(lat: number, lng: number) {
    const qs: typeof document.querySelector = document.querySelector.bind(document);
    const introScreen = qs('#intro-screen') as HTMLElement;
    const queryButton = qs('#query-button');
    const queryingScreen = qs('#querying-screen') as HTMLElement;
    const queryState = qs('#query-state');
    const chooseScreen = qs('#choose-screen') as HTMLElement;
    const startNodeIdElem = qs('#start-node-id');
    const goalNodeIdElem = qs('#goal-node-id');
    const searchButton = qs('#search-button') as HTMLButtonElement;
    const resultsScreen = qs('#results-screen') as HTMLElement;
    const searchProgress = qs('#search-progress');
    const searchState = qs('#search-state');
    const map = L.map('map', {
        center: [lat, lng],
        zoom: 17,
        minZoom: 12
    });
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 21,
        maxNativeZoom: 19
    }).addTo(map);
    showElem(introScreen);
    queryButton.addEventListener('click', () => {
        hideElem(introScreen);
        showElem(queryingScreen);
        queryState.textContent = 'Querying Overpass API...';
        const bounds = map.getBounds();
        const query = `
            [out:json];
            way [highway] (
                ${bounds.getSouth()},
                ${bounds.getWest()},
                ${bounds.getNorth()},
                ${bounds.getEast()}
            );
            out geom;
        `;
        fetch('https://overpass-api.de/api/interpreter?data=' + query)
            .then(res => res.json())
            .then((data: OverpassJSON) => {
                queryState.textContent = 'Creating nodes...';
                const nodes = overpassToGraphNodes(data);
                let startNode: GraphNode;
                let goalNode: GraphNode;
                let searchFunction: SearchFunction;
                const defaultCircleStyle = {
                    radius: 6,
                    stroke: false,
                    fillOpacity: 0.7
                };
                const nodeIdToCircle = new Map<number, L.Circle>();
                for (const node of nodes) {
                    nodeIdToCircle.set(node.id,
                        L.circle(node, defaultCircleStyle).bindPopup(circle => {
                            const elem = document.createElement('div');
                            const id = document.createElement('div');
                            id.textContent = node.id.toString();
                            elem.appendChild(id);
                            const startLink = document.createElement('a');
                            startLink.href = '#';
                            startLink.textContent = 'Set as start';
                            startLink.addEventListener('click', () => {
                                if (node === goalNode) {
                                    return;
                                }
                                if (startNode !== undefined) {
                                    (nodeIdToCircle.get(startNode.id) as L.Circle)
                                        .setStyle(defaultCircleStyle);
                                }
                                startNode = node;
                                startNodeIdElem.textContent = startNode.id.toString();
                                checkSearchButton();
                                circle.closePopup();
                                (circle as L.Circle).setStyle(Object.assign({
                                    color: 'red'
                                }, defaultCircleStyle));
                            });
                            elem.appendChild(startLink);
                            elem.appendChild(document.createElement('br'));
                            const goalLink = document.createElement('a');
                            goalLink.href = '#';
                            goalLink.textContent = 'Set as goal';
                            goalLink.addEventListener('click', () => {
                                if (node === startNode) {
                                    return;
                                }
                                if (goalNode !== undefined) {
                                    (nodeIdToCircle.get(goalNode.id) as L.Circle)
                                        .setStyle(defaultCircleStyle);
                                }
                                goalNode = node;
                                goalNodeIdElem.textContent = goalNode.id.toString();
                                checkSearchButton();
                                circle.closePopup();
                                (circle as L.Circle).setStyle(Object.assign({
                                    color: 'green'
                                }, defaultCircleStyle));
                            });
                            elem.appendChild(goalLink);
                            return elem;
                        }).addTo(map));
                }
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
                queryState.textContent = '';
                hideElem(queryingScreen);
                showElem(chooseScreen);
                console.log(nodes.length + ' nodes created');
                function checkSearchButton() {
                    searchButton.disabled = !(startNode && goalNode && searchFunction);
                }
                searchButton.addEventListener('click', () => {
                    hideElem(chooseScreen);
                    showElem(resultsScreen);
                    searchProgress.classList.add('mdl-progress__indeterminate');
                    searchState.textContent = 'Searching...';
                    const res = searchFunction(startNode, goalNode);
                    searchProgress.classList.remove('mdl-progress__indeterminate');
                    if (res === null) {
                        searchState.textContent = 'Path not found';
                    } else {
                        searchState.textContent = `Path found, ${res.expanded.length} nodes expanded, path is ${res.path.length} nodes long`;
                        for (const expanded of res.expanded) {
                            (nodeIdToCircle.get(expanded.id) as L.Circle)
                            .setStyle(Object.assign({
                                color: 'darkblue'
                            }, defaultCircleStyle))
                        }
                        L.polyline(res.path, {
                            weight: 8,
                            color: 'darkblue'
                        }).addTo(map);
                        console.log(res);
                    }
                });
            });
    });
    function showElem(elem: HTMLElement) {
        elem.style.display = 'block';
    }
    function hideElem(elem: HTMLElement) {
        elem.style.display = 'none';
    }
}