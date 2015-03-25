/*
  Copyright 2013 Google Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var DATE_INDEX = 0;
var PLATFORM_INDEX = 1;
var VERSION_INDEX = 2;
var BOARD_INDEX = 3;
var CHANNEL_INDEX = 4;
var DEVICE_INDEX = 5;

var CHANNELS = [ 'dev-channel', 'beta-channel', 'stable-channel' ];


function generateTimelineHTML(data) {
  var start = getDate(data[data.length - 2].split(',')[DATE_INDEX]);
  start.setHours(12);

  var month = [
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'
  ];
  var days = 0;
  var currentDate = start;
  var timeline = '';

  while (currentDate <= Date.now()) {
    days++;
    var theDayAfter = new Date(currentDate.getTime());
    theDayAfter.setDate(theDayAfter.getDate() + 1);
    if (currentDate.getMonth() !== theDayAfter.getMonth()) {
      timeline += '<td colspan="' + days + '">' +
          month[currentDate.getMonth()] + ' ' +
          currentDate.getFullYear() + '</td>';
      days = 0;
    }
    currentDate = theDayAfter;
  }
  timeline += '<td colspan="' + (days + 1) + '">' +
      month[currentDate.getMonth()] + ' ' +
      currentDate.getFullYear() +
      '</td>';
  document.querySelector('#releasesTable thead tr.date').innerHTML += timeline;
}

function generateReleasesHTML(data) {
  var releases = {};
  var firstDate = undefined;
  var milestones = [];

  for (var i = data.length - 2; i > 0; i--) {
    var line = data[i].split(',');

    if (CHANNELS.indexOf(line[CHANNEL_INDEX]) === -1)
      continue;

    var device = line[BOARD_INDEX];
    var releaseDate = getDate(line[DATE_INDEX]);

    if (!releases[device]) {
      releases[device] = {};
      releases[device].channels = {};
      releases[device].channelsHTML = {
        'dev-channel': [],
        'beta-channel': [],
        'stable-channel': []
      };
      firstDate = firstDate || releaseDate;
    }
    releases[device].deviceName = line[DEVICE_INDEX];
    releases[device].releaseDate = releaseDate;
    releases[device].startDate = releases[device].startDate || firstDate;

    var days = getDateRange(releases[device].startDate,
                            releases[device].releaseDate);
    if (days > -1) {
      for (var channel in releases[device].channelsHTML) {
        if (!releases[device].channels[channel])
          releases[device].channelsHTML[channel].push('<td>&nbsp;</td>');
      }
      releases[device].channels = {};
    }

    // Fill all days with no releases between the two dates
    for (var d = 0; d < days; d++)
      for (var channel in releases[device].channelsHTML)
        releases[device].channelsHTML[channel].push('<td>&nbsp;</td>');

    var channel = line[CHANNEL_INDEX];
    var milestone = parseInt(line[VERSION_INDEX].substr(0, 2));
    var lastRelease = '<td class="' + channel + '" ' +
        'data-version="' + line[VERSION_INDEX] + '" ' +
        'data-platform="' + line[PLATFORM_INDEX] + '" ' +
        'data-milestone="' + milestone + '" ' +
        'data-date="' + releaseDate.toDateString() + '" >' +
        '</td>';
    if (!releases[device].channels[channel]) {
      releases[device].channelsHTML[channel].push(lastRelease);
    } else {
      var lastReleaseIndex = releases[device].channelsHTML[channel].length - 1;
      releases[device].channelsHTML[channel][lastReleaseIndex] = lastRelease;
    }

    // Deal with milestones
    if (milestones.length > 0)
      previousMilestone = milestones[milestones.length - 1].version;
    else
      previousMilestone = 0;
    if (milestone && milestone > previousMilestone) {
      milestones.push({
        version: milestone,
        date: releaseDate
      });
    }
    releases[device].channels[channel] = true;
    releases[device].startDate = releases[device].releaseDate;
  }

  displayReleases(releases);
  displayMilestones(milestones);
}

function displayReleases(releases) {
  var devicesTbodyHTML = '';
  var releasesTbodyHTML = '';
  for (device in releases) {
    devicesTbodyHTML +=
        '<tr><td>' + prettify(releases[device].deviceName) + '</td></tr><tr></tr>';
    releasesTbodyHTML += '<tr>' +
        releases[device].channelsHTML['dev-channel'].join('') +
        '</tr><tr>' +
        releases[device].channelsHTML['beta-channel'].join('') +
        '</tr><tr>' +
        releases[device].channelsHTML['stable-channel'].join('') +
        '</tr><tr></tr>';
  }
  document.querySelector('#devicesTable tbody').innerHTML += devicesTbodyHTML;
  document.querySelector('#releasesTable tbody').innerHTML += releasesTbodyHTML;
}

function displayMilestones(milestones) {
  var milestoneHTML = '';
  for (var m = 0; m < milestones.length; m++) {
    if (m === milestones.length - 1) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 2); // make sure we overlap today
    } else {
      endDate = milestones[m + 1].date;
    }
    var milestoneVersion = 'M' + milestones[m].version;
    milestoneHTML += '<td '+
        'colspan=' + (getDateRange(milestones[m].date, endDate) + 1) + '>' +
        '<span alt="Click to highlight ' + milestoneVersion+ ' updates" ' +
        'title="Click to highlight ' + milestoneVersion + ' updates">' +
        milestoneVersion + '</span></td>';
  }

  var releaseBACK = '<div class="in"></div>';

  var milestoneRow = document.querySelector('tr.milestone');
  milestoneRow.innerHTML += milestoneHTML + releaseBACK;

  milestoneRow.addEventListener('mousewheel', function(e) {
    document.body.scrollLeft -= e.wheelDelta;
  });
  milestoneRow.addEventListener('click', function(e) {
    if (e.target.nodeName !== 'SPAN')
      return;
    e.target.classList.toggle('checked');
    if (document.querySelectorAll('.checked').length > 0)
      document.querySelector('#releasesTable tbody').classList.add('dim');
    else
      document.querySelector('#releasesTable tbody').classList.remove('dim');

    var milestone = e.target.textContent.substr(1);
    var m = document.querySelectorAll('[data-milestone="' + milestone + '"]');
    for (var i = 0; i < m.length; i++)
      m[i].classList.toggle('hl');
  });
}

function setupBubble() {
  document.querySelector('#releasesTable').addEventListener('mouseover',
      function(e) {
    var bubble = document.querySelector('.bubble');
    if (!e.target.dataset.version) {
      bubble.style.display = 'none';
      return;
    }
    bubble.innerHTML =
        '<a target="_blank" href="//www.google.com/search?q=' +
        'site:http://googlechromereleases.blogspot.com%20' +
        e.target.dataset.version + '">' +
        e.target.dataset.version + ' - ' +
        e.target.dataset.platform + '</a><span>' +
        e.target.dataset.date + '<span>';
    var table = document.querySelector('#releasesTable');
    bubble.style.display = 'block';
    bubble.style.position = 'absolute';
    bubble.style.left = table.offsetLeft + e.target.offsetLeft - 180 / 2 -
        e.target.offsetWidth + 4 + 'px';
    bubble.style.top = table.offsetTop + e.target.offsetTop +
        e.target.offsetHeight + 3 + 'px';
  });

  var legend = document.querySelector('#legend');
  legend.style.display = 'block';
  legend.addEventListener('mouseover', function(e) {
    var bubble = document.querySelector('.bubble');
    if (!e.target.dataset.version) {
      bubble.style.display = 'none';
      return;
    }
    bubble.innerHTML = '<a href="#">version - platform</a><span>date<span>';
    bubble.style.left = e.target.offsetLeft - 5 + 'px';
    bubble.style.top = e.target.offsetTop + 108 + 'px';
    bubble.style.display = 'block';
    bubble.style.position = 'fixed';
  });
}

function setupArrows() {
  // Handle arrows mouse events
  var scrollOffset = 0;
  var rafId = null;
  var arrows = document.querySelector('.arrows');
  arrows.style.display = 'block';
  arrows.addEventListener('mouseover', function(e) {
    scrollOffset = parseInt(e.target.dataset.offset) || 0;
    (function scroll() {
      document.body.scrollLeft += scrollOffset;
      rafId = requestAnimationFrame(scroll);
    })();
  });
  arrows.addEventListener('mouseout', function() {
    cancelAnimationFrame(rafId);
  });
  arrows.addEventListener('mousedown', function() {
    scrollOffset = scrollOffset * 5;
  });
  arrows.addEventListener('mouseup', function() {
    scrollOffset = scrollOffset / 5;
  });
}

// Utility function to get number of days between two dates
function getDateRange(firstDateTime, secondDateTime) {
  var d1 = new Date(firstDateTime.getTime());
  d1.setHours(12);
  d1.setDate(d1.getDate() + 1);

  var d2 = new Date(secondDateTime.getTime());
  d2.setHours(12);

  var milliSecondsInADay = 24 * 60 * 60 * 1000;
  return Math.round((d2.getTime() - d1.getTime()) / milliSecondsInADay);
}

// Returns a prettified device name
function prettify(deviceName) {
  switch (deviceName) {
    case 'Google Chromebook Pixel':
      return 'Chromebook Pixel';
    case 'Samsung Series 5 - He':
      return 'Samsung Series 5';
    case 'Acer AC700 - He':
      return 'Acer AC700';
    default:
      return deviceName;
  }
}

// Helper function just for firefox
function getDate(dateString) {
  return new Date(dateString.substr(0, 4),
                  parseInt(dateString.substr(5, 2)) - 1,
                  dateString.substr(8, 2),
                  dateString.substr(11, 2),
                  dateString.substr(14, 2),
                  dateString.substr(17, 2),
                  dateString.substr(20, 3));
}

// Hopefully, I will get rid of this soon ;)
window.requestAnimationFrame = (function() {
  return window.requestAnimationFrame || window.mozRequestAnimationFrame;
})();
window.cancelAnimationFrame = (function() {
  return window.cancelAnimationFrame || window.mozCancelAnimationFrame;
})();

var xhr = new XMLHttpRequest();
xhr.open('GET', 'historyBIG.csv');
xhr.onload = function() {
  if (xhr.readyState !== 4 || xhr.status !== 200)
    return;

  var data = xhr.responseText.split('\n');
  generateTimelineHTML(data);
  generateReleasesHTML(data);
  setupBubble();
  setupArrows();
};
xhr.send();
