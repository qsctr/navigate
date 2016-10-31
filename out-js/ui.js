'use strict';
onerror = alert;
navigator.geolocation.getCurrentPosition(function (pos) { return init(pos.coords.latitude, pos.coords.longitude); }, function () { return init(25.116035, 121.529946); } // fallback to TAS
);
function init(lat, lng) {
    var qs = document.querySelector.bind(document);
    var introScreen = qs('#intro-screen');
    var queryButton = qs('#query-button');
    var areaTooBig = qs('#area-too-big-warning');
    var queryingScreen = qs('#querying-screen');
    var queryState = qs('#query-state');
    var chooseScreen = qs('#choose-screen');
    var nodesCreatedElem = qs('#nodes-created');
    var startNodeIdElem = qs('#start-node-id');
    var goalNodeIdElem = qs('#goal-node-id');
    var searchButton = qs('#search-button');
    var resultsScreen = qs('#results-screen');
    var searchProgress = qs('#search-progress');
    var searchState = qs('#search-state');
    var map = L.map('map', {
        center: [lat, lng],
        zoom: 17
    });
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 21,
        maxNativeZoom: 19
    }).addTo(map);
    map.on('zoom', function () {
        if (map.getZoom() < 13) {
            queryButton.disabled = true;
            showElem(areaTooBig);
        }
        else {
            queryButton.disabled = false;
            hideElem(areaTooBig);
        }
    });
    showElem(introScreen);
    queryButton.addEventListener('click', function () {
        hideElem(introScreen);
        showElem(queryingScreen);
        queryState.textContent = 'Querying Overpass API...';
        var bounds = map.getBounds();
        var query = "\n            [out:json];\n            way [highway] (\n                " + bounds.getSouth() + ",\n                " + bounds.getWest() + ",\n                " + bounds.getNorth() + ",\n                " + bounds.getEast() + "\n            );\n            out geom;\n        ";
        fetch('https://overpass-api.de/api/interpreter?data=' + query)
            .then(function (res) { return res.json(); })
            .then(function (data) {
            queryState.textContent = 'Creating nodes...';
            var nodes = overpassToGraphNodes(data);
            var startNode = null;
            var goalNode = null;
            var searchFunction;
            var defaultCircleStyle = {
                radius: 6,
                stroke: false,
                fillOpacity: 0.7
            };
            var nodeIdToCircle = new Map();
            var _loop_1 = function(node) {
                nodeIdToCircle.set(node.id, L.circle(node, defaultCircleStyle).bindPopup(function (circle) {
                    var elem = document.createElement('div');
                    var id = document.createElement('div');
                    id.textContent = node.id.toString();
                    elem.appendChild(id);
                    var startLink = document.createElement('a');
                    startLink.href = '#';
                    startLink.textContent = 'Set as start';
                    startLink.addEventListener('click', function () {
                        if (node === goalNode) {
                            goalNode = null;
                            goalNodeIdElem.textContent = '';
                            nodeIdToCircle.get(node.id)
                                .setStyle(defaultCircleStyle);
                        }
                        if (startNode !== null) {
                            nodeIdToCircle.get(startNode.id)
                                .setStyle(defaultCircleStyle);
                        }
                        startNode = node;
                        startNodeIdElem.textContent = startNode.id.toString();
                        checkSearchButton();
                        circle.closePopup();
                        circle.setStyle(Object.assign({
                            color: 'red'
                        }, defaultCircleStyle));
                    });
                    elem.appendChild(startLink);
                    elem.appendChild(document.createElement('br'));
                    var goalLink = document.createElement('a');
                    goalLink.href = '#';
                    goalLink.textContent = 'Set as goal';
                    goalLink.addEventListener('click', function () {
                        if (node === startNode) {
                            startNode = null;
                            startNodeIdElem.textContent = '';
                            nodeIdToCircle.get(node.id)
                                .setStyle(defaultCircleStyle);
                        }
                        if (goalNode) {
                            nodeIdToCircle.get(goalNode.id)
                                .setStyle(defaultCircleStyle);
                        }
                        goalNode = node;
                        goalNodeIdElem.textContent = goalNode.id.toString();
                        checkSearchButton();
                        circle.closePopup();
                        circle.setStyle(Object.assign({
                            color: 'green'
                        }, defaultCircleStyle));
                    });
                    elem.appendChild(goalLink);
                    return elem;
                }).addTo(map));
            };
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                _loop_1(node);
            }
            var radioToFunction = {
                'uniform-cost-radio': uniformCostSearch,
                'greedy-radio': greedySearch,
                'a-star-radio': aStarSearch
            };
            var _loop_2 = function(id) {
                document.querySelector('#' + id).addEventListener('click', function () {
                    searchFunction = radioToFunction[id];
                    checkSearchButton();
                });
            };
            for (var id in radioToFunction) {
                _loop_2(id);
            }
            nodesCreatedElem.textContent = nodes.length.toString();
            queryState.textContent = '';
            hideElem(queryingScreen);
            showElem(chooseScreen);
            function checkSearchButton() {
                searchButton.disabled = !(startNode && goalNode && searchFunction);
            }
            searchButton.addEventListener('click', function () {
                hideElem(chooseScreen);
                showElem(resultsScreen);
                searchProgress.classList.add('mdl-progress__indeterminate');
                searchState.textContent = 'Searching...';
                var res = searchFunction(startNode, goalNode);
                searchProgress.classList.remove('mdl-progress__indeterminate');
                if (res === null) {
                    searchState.textContent = 'Path not found';
                }
                else {
                    searchState.textContent = "Path found, " + res.expanded.length + " nodes expanded, path is " + res.path.length + " nodes long";
                    for (var _i = 0, _a = res.expanded; _i < _a.length; _i++) {
                        var expanded = _a[_i];
                        nodeIdToCircle.get(expanded.id)
                            .setStyle(Object.assign({
                            color: 'darkblue'
                        }, defaultCircleStyle));
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
    function showElem(elem) {
        elem.style.display = 'block';
    }
    function hideElem(elem) {
        elem.style.display = 'none';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMtdHMvdWkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBRWIsT0FBTyxHQUFHLEtBQUssQ0FBQztBQUVoQixTQUFTLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUNwQyxVQUFBLEdBQUcsSUFBSSxPQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUEvQyxDQUErQyxFQUN0RCxjQUFNLE9BQUEsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxrQkFBa0I7Q0FDdkQsQ0FBQztBQUVGLGNBQWMsR0FBVyxFQUFFLEdBQVc7SUFDbEMsSUFBTSxFQUFFLEdBQWtDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hGLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQWdCLENBQUM7SUFDdkQsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBc0IsQ0FBQztJQUM3RCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQWdCLENBQUM7SUFDOUQsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFnQixDQUFDO0lBQzdELElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0QyxJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQWdCLENBQUM7SUFDekQsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM5QyxJQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM3QyxJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDM0MsSUFBTSxZQUFZLEdB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QUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUNqQyxDQUFDO0lBQ0Qsa0JBQWtCLElBQWlCO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUNoQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbm9uZXJyb3IgPSBhbGVydDtcclxuXHJcbm5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oXHJcbiAgICBwb3MgPT4gaW5pdChwb3MuY29vcmRzLmxhdGl0dWRlLCBwb3MuY29vcmRzLmxvbmdpdHVkZSksXHJcbiAgICAoKSA9PiBpbml0KDI1LjExNjAzNSwgMTIxLjUyOTk0NikgLy8gZmFsbGJhY2sgdG8gVEFTXHJcbik7XHJcblxyXG5mdW5jdGlvbiBpbml0KGxhdDogbnVtYmVyLCBsbmc6IG51bWJlcikge1xyXG4gICAgY29uc3QgcXM6IHR5cGVvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvci5iaW5kKGRvY3VtZW50KTtcclxuICAgIGNvbnN0IGludHJvU2NyZWVuID0gcXMoJyNpbnRyby1zY3JlZW4nKSBhcyBIVE1MRWxlbWVudDtcclxuICAgIGNvbnN0IHF1ZXJ5QnV0dG9uID0gcXMoJyNxdWVyeS1idXR0b24nKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIGNvbnN0IGFyZWFUb29CaWcgPSBxcygnI2FyZWEtdG9vLWJpZy13YXJuaW5nJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICBjb25zdCBxdWVyeWluZ1NjcmVlbiA9IHFzKCcjcXVlcnlpbmctc2NyZWVuJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICBjb25zdCBxdWVyeVN0YXRlID0gcXMoJyNxdWVyeS1zdGF0ZScpO1xyXG4gICAgY29uc3QgY2hvb3NlU2NyZWVuID0gcXMoJyNjaG9vc2Utc2NyZWVuJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICBjb25zdCBub2Rlc0NyZWF0ZWRFbGVtID0gcXMoJyNub2Rlcy1jcmVhdGVkJyk7XHJcbiAgICBjb25zdCBzdGFydE5vZGVJZEVsZW0gPSBxcygnI3N0YXJ0LW5vZGUtaWQnKTtcclxuICAgIGNvbnN0IGdvYWxOb2RlSWRFbGVtID0gcXMoJyNnb2FsLW5vZGUtaWQnKTtcclxuICAgIGNvbnN0IHNlYXJjaEJ1dHRvbiA9IHFzKCcjc2VhcmNoLWJ1dHRvbicpIGFzIEhUTUxCdXR0b25FbGVtZW50O1xyXG4gICAgY29uc3QgcmVzdWx0c1NjcmVlbiA9IHFzKCcjcmVzdWx0cy1zY3JlZW4nKSBhcyBIVE1MRWxlbWVudDtcclxuICAgIGNvbnN0IHNlYXJjaFByb2dyZXNzID0gcXMoJyNzZWFyY2gtcHJvZ3Jlc3MnKTtcclxuICAgIGNvbnN0IHNlYXJjaFN0YXRlID0gcXMoJyNzZWFyY2gtc3RhdGUnKTtcclxuICAgIGNvbnN0IG1hcCA9IEwubWFwKCdtYXAnLCB7XHJcbiAgICAgICAgY2VudGVyOiBbbGF0LCBsbmddLFxyXG4gICAgICAgIHpvb206IDE3XHJcbiAgICB9KTtcclxuICAgIEwudGlsZUxheWVyKCdodHRwOi8ve3N9LnRpbGUub3NtLm9yZy97en0ve3h9L3t5fS5wbmcnLCB7XHJcbiAgICAgICAgYXR0cmlidXRpb246ICcmY29weTsgPGEgaHJlZj1cImh0dHA6Ly9vc20ub3JnL2NvcHlyaWdodFwiPk9wZW5TdHJlZXRNYXA8L2E+IGNvbnRyaWJ1dG9ycycsXHJcbiAgICAgICAgbWF4Wm9vbTogMjEsXHJcbiAgICAgICAgbWF4TmF0aXZlWm9vbTogMTlcclxuICAgIH0pLmFkZFRvKG1hcCk7XHJcbiAgICBtYXAub24oJ3pvb20nLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKG1hcC5nZXRab29tKCkgPCAxMykge1xyXG4gICAgICAgICAgICBxdWVyeUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNob3dFbGVtKGFyZWFUb29CaWcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHF1ZXJ5QnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGhpZGVFbGVtKGFyZWFUb29CaWcpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgc2hvd0VsZW0oaW50cm9TY3JlZW4pO1xyXG4gICAgcXVlcnlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgaGlkZUVsZW0oaW50cm9TY3JlZW4pO1xyXG4gICAgICAgIHNob3dFbGVtKHF1ZXJ5aW5nU2NyZWVuKTtcclxuICAgICAgICBxdWVyeVN0YXRlLnRleHRDb250ZW50ID0gJ1F1ZXJ5aW5nIE92ZXJwYXNzIEFQSS4uLic7XHJcbiAgICAgICAgY29uc3QgYm91bmRzID0gbWFwLmdldEJvdW5kcygpO1xyXG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gYFxyXG4gICAgICAgICAgICBbb3V0Ompzb25dO1xyXG4gICAgICAgICAgICB3YXkgW2hpZ2h3YXldIChcclxuICAgICAgICAgICAgICAgICR7Ym91bmRzLmdldFNvdXRoKCl9LFxyXG4gICAgICAgICAgICAgICAgJHtib3VuZHMuZ2V0V2VzdCgpfSxcclxuICAgICAgICAgICAgICAgICR7Ym91bmRzLmdldE5vcnRoKCl9LFxyXG4gICAgICAgICAgICAgICAgJHtib3VuZHMuZ2V0RWFzdCgpfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBvdXQgZ2VvbTtcclxuICAgICAgICBgO1xyXG4gICAgICAgIGZldGNoKCdodHRwczovL292ZXJwYXNzLWFwaS5kZS9hcGkvaW50ZXJwcmV0ZXI/ZGF0YT0nICsgcXVlcnkpXHJcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG4gICAgICAgICAgICAudGhlbigoZGF0YTogT3ZlcnBhc3NKU09OKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0YXRlLnRleHRDb250ZW50ID0gJ0NyZWF0aW5nIG5vZGVzLi4uJztcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gb3ZlcnBhc3NUb0dyYXBoTm9kZXMoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnROb2RlOiBHcmFwaE5vZGUgfCBudWxsID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGxldCBnb2FsTm9kZTogR3JhcGhOb2RlIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2VhcmNoRnVuY3Rpb246IFNlYXJjaEZ1bmN0aW9uO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdENpcmNsZVN0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhZGl1czogNixcclxuICAgICAgICAgICAgICAgICAgICBzdHJva2U6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiAwLjdcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlSWRUb0NpcmNsZSA9IG5ldyBNYXA8bnVtYmVyLCBMLkNpcmNsZT4oKTtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVJZFRvQ2lyY2xlLnNldChub2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBMLmNpcmNsZShub2RlLCBkZWZhdWx0Q2lyY2xlU3R5bGUpLmJpbmRQb3B1cChjaXJjbGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkLnRleHRDb250ZW50ID0gbm9kZS5pZC50b1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hcHBlbmRDaGlsZChpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydExpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmsuaHJlZiA9ICcjJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0TGluay50ZXh0Q29udGVudCA9ICdTZXQgYXMgc3RhcnQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5rLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlID09PSBnb2FsTm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnb2FsTm9kZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvYWxOb2RlSWRFbGVtLnRleHRDb250ZW50ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChub2RlSWRUb0NpcmNsZS5nZXQobm9kZS5pZCkgYXMgTC5DaXJjbGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0U3R5bGUoZGVmYXVsdENpcmNsZVN0eWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0Tm9kZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobm9kZUlkVG9DaXJjbGUuZ2V0KHN0YXJ0Tm9kZS5pZCkgYXMgTC5DaXJjbGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0U3R5bGUoZGVmYXVsdENpcmNsZVN0eWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnROb2RlID0gbm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGVJZEVsZW0udGV4dENvbnRlbnQgPSBzdGFydE5vZGUuaWQudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1NlYXJjaEJ1dHRvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNpcmNsZS5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNpcmNsZSBhcyBMLkNpcmNsZSkuc2V0U3R5bGUoT2JqZWN0LmFzc2lnbih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAncmVkJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGRlZmF1bHRDaXJjbGVTdHlsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmFwcGVuZENoaWxkKHN0YXJ0TGluayk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ29hbExpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnb2FsTGluay5ocmVmID0gJyMnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ29hbExpbmsudGV4dENvbnRlbnQgPSAnU2V0IGFzIGdvYWwnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ29hbExpbmsuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUgPT09IHN0YXJ0Tm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGVJZEVsZW0udGV4dENvbnRlbnQgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5vZGVJZFRvQ2lyY2xlLmdldChub2RlLmlkKSBhcyBMLkNpcmNsZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRTdHlsZShkZWZhdWx0Q2lyY2xlU3R5bGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ29hbE5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5vZGVJZFRvQ2lyY2xlLmdldChnb2FsTm9kZS5pZCkgYXMgTC5DaXJjbGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0U3R5bGUoZGVmYXVsdENpcmNsZVN0eWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ29hbE5vZGUgPSBub2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvYWxOb2RlSWRFbGVtLnRleHRDb250ZW50ID0gZ29hbE5vZGUuaWQudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1NlYXJjaEJ1dHRvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNpcmNsZS5jbG9zZVBvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNpcmNsZSBhcyBMLkNpcmNsZSkuc2V0U3R5bGUoT2JqZWN0LmFzc2lnbih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnZ3JlZW4nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZGVmYXVsdENpcmNsZVN0eWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXBwZW5kQ2hpbGQoZ29hbExpbmspO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmFkZFRvKG1hcCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmFkaW9Ub0Z1bmN0aW9uOiB7IFtpZDogc3RyaW5nXTogU2VhcmNoRnVuY3Rpb24gfSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAndW5pZm9ybS1jb3N0LXJhZGlvJzogdW5pZm9ybUNvc3RTZWFyY2gsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dyZWVkeS1yYWRpbyc6IGdyZWVkeVNlYXJjaCxcclxuICAgICAgICAgICAgICAgICAgICAnYS1zdGFyLXJhZGlvJzogYVN0YXJTZWFyY2hcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGlkIGluIHJhZGlvVG9GdW5jdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgaWQpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hGdW5jdGlvbiA9IHJhZGlvVG9GdW5jdGlvbltpZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrU2VhcmNoQnV0dG9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBub2Rlc0NyZWF0ZWRFbGVtLnRleHRDb250ZW50ID0gbm9kZXMubGVuZ3RoLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVN0YXRlLnRleHRDb250ZW50ID0gJyc7XHJcbiAgICAgICAgICAgICAgICBoaWRlRWxlbShxdWVyeWluZ1NjcmVlbik7XHJcbiAgICAgICAgICAgICAgICBzaG93RWxlbShjaG9vc2VTY3JlZW4pO1xyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tTZWFyY2hCdXR0b24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoQnV0dG9uLmRpc2FibGVkID0gIShzdGFydE5vZGUgJiYgZ29hbE5vZGUgJiYgc2VhcmNoRnVuY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2VhcmNoQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGhpZGVFbGVtKGNob29zZVNjcmVlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hvd0VsZW0ocmVzdWx0c1NjcmVlbik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoUHJvZ3Jlc3MuY2xhc3NMaXN0LmFkZCgnbWRsLXByb2dyZXNzX19pbmRldGVybWluYXRlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoU3RhdGUudGV4dENvbnRlbnQgPSAnU2VhcmNoaW5nLi4uJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXMgPSBzZWFyY2hGdW5jdGlvbihzdGFydE5vZGUgYXMgR3JhcGhOb2RlLCBnb2FsTm9kZSBhcyBHcmFwaE5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFByb2dyZXNzLmNsYXNzTGlzdC5yZW1vdmUoJ21kbC1wcm9ncmVzc19faW5kZXRlcm1pbmF0ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoU3RhdGUudGV4dENvbnRlbnQgPSAnUGF0aCBub3QgZm91bmQnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFN0YXRlLnRleHRDb250ZW50ID0gYFBhdGggZm91bmQsICR7cmVzLmV4cGFuZGVkLmxlbmd0aH0gbm9kZXMgZXhwYW5kZWQsIHBhdGggaXMgJHtyZXMucGF0aC5sZW5ndGh9IG5vZGVzIGxvbmdgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV4cGFuZGVkIG9mIHJlcy5leHBhbmRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5vZGVJZFRvQ2lyY2xlLmdldChleHBhbmRlZC5pZCkgYXMgTC5DaXJjbGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0U3R5bGUoT2JqZWN0LmFzc2lnbih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICdkYXJrYmx1ZSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGRlZmF1bHRDaXJjbGVTdHlsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEwucG9seWxpbmUocmVzLnBhdGgsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDogOCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnZGFya2JsdWUnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmFkZFRvKG1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBmdW5jdGlvbiBzaG93RWxlbShlbGVtOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGVsZW0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBoaWRlRWxlbShlbGVtOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGVsZW0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH1cclxufSJdfQ==