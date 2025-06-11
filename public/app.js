// Google Analytics initialization
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-13VGFN8ZFX', {
  page_title: 'Kakomon Search System',
  page_location: window.location.href
});

// Custom GA event helpers
function sendGAEvent(action, category, label, value) {
  gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
}

function trackSearch(searchQuery, filters) {
  gtag('event', 'search', {
    search_term: searchQuery,
    event_category: 'engagement',
    event_label: 'kakomon_search',
    custom_parameters: {
      subject_filter: filters.subject || '',
      grade_filter: filters.grade || '',
      period_filter: filters.period || ''
    }
  });
}

function trackFileAction(action, fileName, fileUrl) {
  gtag('event', action, {
    event_category: 'file_interaction',
    event_label: fileName,
    file_url: fileUrl
  });
}

function trackFilterUsage(filterType, filterValue) {
  gtag('event', 'filter_usage', {
    event_category: 'user_interaction',
    event_label: filterType,
    filter_value: filterValue
  });
}

function trackPageDetailsView(pageTitle) {
  gtag('event', 'view_page_details', {
    event_category: 'content_interaction',
    event_label: pageTitle
  });
}

// Main application logic migrated from index.html
// Filter options storage
let filterOptions = {
  subjects: new Set(),
  grades: new Set(),
  periods: new Set()
};

// Page details cache
const pageDetailsCache = new Map();

// Preload queue and concurrency control
const preloadQueue = [];
let activePreloads = 0;
const MAX_CONCURRENT_PRELOADS = 3;

function schedulePreload(pageId) {
  if (pageDetailsCache.has(pageId) || preloadQueue.includes(pageId)) {
    return;
  }
  preloadQueue.push(pageId);
  runNextPreload();
}

function runNextPreload() {
  if (activePreloads >= MAX_CONCURRENT_PRELOADS || preloadQueue.length === 0) {
    return;
  }
  const id = preloadQueue.shift();
  activePreloads++;
  preloadPageDetails(id).finally(() => {
    activePreloads--;
    runNextPreload();
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.dataset.pageId;
      if (id) schedulePreload(id);
      observer.unobserve(entry.target);
    }
  });
});

function formatProperty(property) {
  if (property.type === 'title') {
    return property.title.map(t => t.plain_text).join('');
  } else if (property.type === 'multi_select') {
    return property.multi_select.map(s => s.name).join(', ');
  } else if (property.type === 'select' && property.select) {
    return property.select.name;
  } else if (property.type === 'date' && property.date) {
    return property.date.start;
  } else if (property.type === 'number' && property.number !== null) {
    return property.number.toString();
  } else if (property.type === 'rich_text') {
    return property.rich_text.map(t => t.plain_text).join('');
  }
  return '';
}

function escapeHTML(str) {
  return str ? str.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])) : '';
}

function hasActualContent(content) {
  if (!content || content.length === 0) return false;
  const nonChildPageContent = content.filter(block => block.type !== 'child_page');
  for (const block of nonChildPageContent) {
    if (block.type === 'paragraph' && block.paragraph.rich_text) {
      const text = block.paragraph.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'heading_1' && block.heading_1.rich_text) {
      const text = block.heading_1.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'heading_2' && block.heading_2.rich_text) {
      const text = block.heading_2.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'heading_3' && block.heading_3.rich_text) {
      const text = block.heading_3.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text) {
      const text = block.bulleted_list_item.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text) {
      const text = block.numbered_list_item.rich_text.map(text => text.plain_text).join('').trim();
      if (text) return true;
    } else if (block.type === 'table_row' && block.table_row && block.table_row.cells) {
      const hasContent = block.table_row.cells.some(cell =>
        cell.some(text => text.plain_text.trim())
      );
      if (hasContent) return true;
    }
  }
  return false;
}

function parseMarkdownToHTML(markdown) {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let listType = null;
  let inTable = false;
  let isFirstTableRow = true;
  let tableHeaders = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine === '[TABLE_START]') {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = null;
      }
      inTable = true;
      isFirstTableRow = true;
      html += '<div class="table-container"><table>\n';
      continue;
    }

    if (trimmedLine.includes('|') && trimmedLine.split('|').length > 2) {
      const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (!inTable) {
        if (inList) {
          html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
          inList = false;
          listType = null;
        }
        html += '<div class="table-container"><table>\n';
        inTable = true;
        isFirstTableRow = true;
      }
      if (isFirstTableRow) {
        tableHeaders = cells;
        html += '<thead>\n<tr>\n';
        cells.forEach(cell => {
          html += `<th>${cell}</th>\n`;
        });
        html += '</tr>\n</thead>\n<tbody>\n';
        isFirstTableRow = false;
      } else {
        html += '<tr>\n';
        cells.forEach((cell, idx) => {
          const header = tableHeaders[idx] || '';
          html += `<td data-label="${header}">${cell}</td>\n`;
        });
        html += '</tr>\n';
      }
      continue;
    }

    if (inTable) {
      html += '</tbody></table></div>\n';
      inTable = false;
      isFirstTableRow = true;
      tableHeaders = [];
    }

    if (trimmedLine.startsWith('### ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = null;
      }
      html += `<h3>${trimmedLine.substring(4)}</h3>\n`;
    } else if (trimmedLine.startsWith('## ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = null;
      }
      html += `<h2>${trimmedLine.substring(3)}</h2>\n`;
    } else if (trimmedLine.startsWith('# ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = null;
      }
      html += `<h1>${trimmedLine.substring(2)}</h1>\n`;
    } else if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
      if (!inList || listType !== 'ul') {
        if (inList && listType === 'ol') {
          html += '</ol>\n';
        }
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${trimmedLine.substring(2)}</li>\n`;
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      if (!inList || listType !== 'ol') {
        if (inList && listType === 'ul') {
          html += '</ul>\n';
        }
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>\n`;
    } else {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = null;
      }
      html += `<p>${trimmedLine}</p>\n`;
    }
  }
  if (inList) {
    html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
  }
  if (inTable) {
    html += '</tbody></table></div>\n';
  }
  return html;
}

async function search() {
  const query = document.getElementById('searchInput').value.trim();
  const subject = document.getElementById('subjectFilter').value;
  const grade = document.getElementById('gradeFilter').value;
  const period = document.getElementById('periodFilter').value;
  const resultsDiv = document.getElementById('results');

  trackSearch(query, { subject, grade, period });

  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (subject) params.append('subject', subject);
  if (grade) params.append('grade', grade);
  if (period) params.append('period', period);

  try {
    const response = await fetch('/search?' + params.toString());
    const data = await response.json();

    resultsDiv.innerHTML = '';
    if (data.length === 0) {
      resultsDiv.innerHTML = '<div class="error">検索結果が見つかりませんでした。</div>';
      return;
    }

    let html = '';
    for (const item of data) {
      const title = formatProperty(item.properties['名前']) || 'タイトル不明';
      const subjects = formatProperty(item.properties['教科']);
      const grd = formatProperty(item.properties['学年']);
      const prd = formatProperty(item.properties['時期']);

      html += `<div class="result-item" data-page-id="${item.id}" data-page-title="${escapeHTML(title)}">`;
      html += `<div class="result-title">${escapeHTML(title)}</div>`;
      html += '<div class="result-meta">';
      if (subjects) html += `<span class="meta-item subject">教科: ${escapeHTML(subjects)}</span>`;
      if (grd) html += `<span class="meta-item grade">学年: ${escapeHTML(grd)}</span>`;
      if (prd) html += `<span class="meta-item period">時期: ${escapeHTML(prd)}</span>`;
      html += '</div>';
      html += '<a href="#" class="show-details-btn">クリックしてファイルを表示</a>';
      html += '</div>';
    }

    resultsDiv.innerHTML = html;

    resultsDiv.querySelectorAll('.result-item').forEach(resultDiv => {
      const id = resultDiv.dataset.pageId;
      observer.observe(resultDiv);

      const showDetailsLink = resultDiv.querySelector('.show-details-btn');
      showDetailsLink.style.cssText = `
        display: block;
        margin-top: 20px;
        padding: 16px 30px;
        color: white;
        text-decoration: none;
        border-radius: 15px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        transition: all 0.3s ease;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
      `;

      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDarkMode) {
        showDetailsLink.style.background = 'linear-gradient(135deg, rgba(90, 159, 212, 0.8) 0%, rgba(123, 179, 224, 0.8) 100%)';
        showDetailsLink.style.boxShadow = '0 4px 16px rgba(90, 159, 212, 0.2)';
      } else {
        showDetailsLink.style.background = 'linear-gradient(135deg, rgba(255, 145, 115, 0.85) 0%, rgba(255, 138, 101, 0.85) 100%)';
        showDetailsLink.style.boxShadow = '0 4px 16px rgba(255, 145, 115, 0.2)';
      }

      showDetailsLink.onmouseover = () => {
        if (isDarkMode) {
          showDetailsLink.style.background = 'linear-gradient(135deg, rgba(123, 179, 224, 0.9) 0%, rgba(160, 196, 232, 0.9) 100%)';
          showDetailsLink.style.boxShadow = '0 8px 25px rgba(90, 159, 212, 0.3)';
        } else {
          showDetailsLink.style.background = 'linear-gradient(135deg, rgba(255, 134, 101, 0.9) 0%, rgba(255, 114, 86, 0.9) 100%)';
          showDetailsLink.style.boxShadow = '0 8px 25px rgba(255, 145, 115, 0.3)';
        }
        showDetailsLink.style.transform = 'translateY(-3px)';
      };
      showDetailsLink.onmouseout = () => {
        if (isDarkMode) {
          showDetailsLink.style.background = 'linear-gradient(135deg, rgba(90, 159, 212, 0.8) 0%, rgba(123, 179, 224, 0.8) 100%)';
          showDetailsLink.style.boxShadow = '0 4px 16px rgba(90, 159, 212, 0.2)';
        } else {
          showDetailsLink.style.background = 'linear-gradient(135deg, rgba(255, 145, 115, 0.85) 0%, rgba(255, 138, 101, 0.85) 100%)';
          showDetailsLink.style.boxShadow = '0 4px 16px rgba(255, 145, 115, 0.2)';
        }
        showDetailsLink.style.transform = 'translateY(0)';
      };
      showDetailsLink.onclick = (e) => {
        e.preventDefault();
        trackPageDetailsView(resultDiv.dataset.pageTitle || 'Unknown Page');
        showPageDetails(id, resultDiv, showDetailsLink);
      };
    });
  } catch (error) {
    console.error('検索エラー:', error);
    resultsDiv.innerHTML = '<div class="error">検索中にエラーが発生しました。</div>';
  }
}

async function preloadPageDetails(pageId) {
  if (pageDetailsCache.has(pageId)) {
    return;
  }

  try {
    const response = await fetch(`/page/${pageId}`);
    const data = await response.json();
    pageDetailsCache.set(pageId, data);
  } catch (error) {
    console.error('ページ詳細のプリロード中にエラーが発生しました:', error);
  }
}

async function showPageDetails(pageId, resultDiv, link) {
  link.style.pointerEvents = 'none';
  link.style.opacity = '0.6';
  link.textContent = '読み込み中...';

  try {
    let data = pageDetailsCache.get(pageId);
    if (!data) {
      const response = await fetch(`/page/${pageId}`);
      data = await response.json();
      pageDetailsCache.set(pageId, data);
    }

    let filesSection = resultDiv.querySelector('.files-section');
    if (!filesSection) {
      filesSection = document.createElement('div');
      filesSection.className = 'files-section';
      resultDiv.appendChild(filesSection);
    }

    filesSection.innerHTML = '';

    if (data.files && data.files.length > 0) {
      const filesTitle = document.createElement('h4');
      filesTitle.textContent = 'ファイル:';
      filesSection.appendChild(filesTitle);

      data.files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';

        const icon = document.createElement('span');
        icon.className = 'pdf-icon';
        icon.textContent = '📄';

        const link = document.createElement('a');
        link.className = 'file-link';
        link.href = file.url;
        link.textContent = file.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'file-btn';
        viewBtn.textContent = '表示';
        viewBtn.onclick = () => {
          trackFileAction('file_view', file.name, file.url);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            window.open(file.url, '_blank', 'noopener,noreferrer');
          } else {
            showPDF(file.url, file.name, resultDiv);
          }
        };

        const openTabBtn = document.createElement('button');
        openTabBtn.className = 'file-btn open-tab';
        openTabBtn.textContent = '新しいタブで開く';
        openTabBtn.onclick = () => {
          trackFileAction('file_open_new_tab', file.name, file.url);
          window.open(file.url, '_blank', 'noopener,noreferrer');
        };

        actionsDiv.appendChild(viewBtn);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS) {
          actionsDiv.appendChild(openTabBtn);
        }

        fileDiv.appendChild(icon);
        fileDiv.appendChild(link);
        fileDiv.appendChild(actionsDiv);
        filesSection.appendChild(fileDiv);
      });
    }

    if (data.childPages && data.childPages.length > 0) {
      const childPagesTitle = document.createElement('h4');
      childPagesTitle.textContent = '子ページ:';
      childPagesTitle.style.marginTop = '20px';
      filesSection.appendChild(childPagesTitle);

      data.childPages.forEach(childPage => {
        const childPageDiv = document.createElement('div');
        childPageDiv.className = 'child-page-item';

        const childPageTitle = document.createElement('h5');
        childPageTitle.textContent = childPage.title;
        childPageTitle.style.cssText = `
          color: var(--text-color);
          margin-bottom: 5px;
          font-size: 15px;
          border-bottom: 1px solid rgba(44, 62, 80, 0.1);
          padding-bottom: 2px;
        `;
        childPageDiv.appendChild(childPageTitle);

        const childPageBtn = document.createElement('button');
        childPageBtn.className = 'file-btn';
        childPageBtn.textContent = '詳細を表示';
        childPageBtn.onclick = () => {
          trackPageDetailsView(childPage.title);
          showChildPageDetails(childPage.id, childPageDiv, childPageBtn);
        };

        childPageDiv.appendChild(childPageBtn);
        filesSection.appendChild(childPageDiv);
      });
    }

    const parentContentBlocks = data.content || [];
    let markdownContent = '';
    parentContentBlocks.forEach(block => {
      if (block.type === 'paragraph' && block.paragraph.rich_text) {
        const text = block.paragraph.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += text + '\n\n';
        }
      } else if (block.type === 'heading_1' && block.heading_1.rich_text) {
        const text = block.heading_1.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '# ' + text + '\n\n';
        }
      } else if (block.type === 'heading_2' && block.heading_2.rich_text) {
        const text = block.heading_2.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '## ' + text + '\n\n';
        }
      } else if (block.type === 'heading_3' && block.heading_3.rich_text) {
        const text = block.heading_3.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '### ' + text + '\n\n';
        }
      } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text) {
        const text = block.bulleted_list_item.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '• ' + text + '\n';
        }
      } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text) {
        const text = block.numbered_list_item.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '1. ' + text + '\n';
        }
      } else if (block.type === 'table') {
        markdownContent += '\n[TABLE_START]\n';
      } else if (block.type === 'table_row' && block.table_row && block.table_row.cells) {
        const cells = block.table_row.cells.map(cell =>
          cell.map(text => text.plain_text).join('').trim()
        );
        markdownContent += '| ' + cells.join(' | ') + ' |\n';
      }
    });

    if (markdownContent.trim()) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'page-content';
      contentDiv.style.marginTop = data.files && data.files.length > 0 || data.childPages && data.childPages.length > 0 ? '20px' : '0';

      const contentTitle = document.createElement('h4');
      contentTitle.textContent = 'メインページ内容:';
      contentTitle.style.cssText = `
        color: var(--text-color);
        margin-bottom: 10px;
        font-size: 16px;
        border-bottom: 2px solid rgba(44, 62, 80, 0.1);
        padding-bottom: 5px;
      `;
      contentDiv.appendChild(contentTitle);

      const contentText = document.createElement('div');
      contentText.className = 'page-text';
      contentText.innerHTML = parseMarkdownToHTML(markdownContent);
      contentDiv.appendChild(contentText);

      filesSection.appendChild(contentDiv);
    }

    if ((!data.files || data.files.length === 0) &&
        (!data.content || data.content.length === 0 || !hasActualContent(data.content))) {
      filesSection.innerHTML = '<div style="color: var(--text-color); font-style: italic; text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; border: 1px dashed rgba(44, 62, 80, 0.3);">ファイルとページ内容はありません</div>';
    }

    link.style.display = 'none';

  } catch (error) {
    console.error('ページ詳細の表示中にエラーが発生しました:', error);
    link.style.pointerEvents = 'auto';
    link.style.opacity = '1';
    link.textContent = 'クリックしてファイルを表示';

    let filesSection = resultDiv.querySelector('.files-section');
    if (!filesSection) {
      filesSection = document.createElement('div');
      filesSection.className = 'files-section';
      resultDiv.appendChild(filesSection);
    }
    filesSection.innerHTML = '<div style="color: #ff6b6b;">エラー: 詳細を取得できませんでした</div>';
  }
}

async function showChildPageDetails(childPageId, container, button) {
  button.style.pointerEvents = 'none';
  button.style.opacity = '0.6';
  button.textContent = '読み込み中...';

  try {
    const response = await fetch(`/child-page/${childPageId}`);
    const data = await response.json();

    const childDetailsSection = document.createElement('div');
    childDetailsSection.className = 'child-details-section';

    if (data.files && data.files.length > 0) {
      const filesTitle = document.createElement('h5');
      filesTitle.textContent = 'ファイル:';
      childDetailsSection.appendChild(filesTitle);

      data.files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';

        const link = document.createElement('a');
        link.className = 'file-link';
        link.href = file.url;
        link.textContent = file.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const openTabBtn = document.createElement('button');
        openTabBtn.className = 'file-btn open-tab';
        openTabBtn.textContent = '新しいタブで開く';
        openTabBtn.onclick = () => {
          trackFileAction('child_file_open_new_tab', file.name, file.url);
          window.open(file.url, '_blank', 'noopener,noreferrer');
        };

        fileDiv.appendChild(link);
        fileDiv.appendChild(openTabBtn);
        childDetailsSection.appendChild(fileDiv);
      });
    }

    const childContentBlocks = data.content || [];
    let markdownContent = '';
    childContentBlocks.forEach(block => {
      if (block.type === 'paragraph' && block.paragraph.rich_text) {
        const text = block.paragraph.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += text + '\n\n';
        }
      } else if (block.type === 'heading_1' && block.heading_1.rich_text) {
        const text = block.heading_1.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '# ' + text + '\n\n';
        }
      } else if (block.type === 'heading_2' && block.heading_2.rich_text) {
        const text = block.heading_2.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '## ' + text + '\n\n';
        }
      } else if (block.type === 'heading_3' && block.heading_3.rich_text) {
        const text = block.heading_3.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '### ' + text + '\n\n';
        }
      } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text) {
        const text = block.bulleted_list_item.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '• ' + text + '\n';
        }
      } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text) {
        const text = block.numbered_list_item.rich_text.map(text => text.plain_text).join('');
        if (text.trim()) {
          markdownContent += '1. ' + text + '\n';
        }
      } else if (block.type === 'table') {
        markdownContent += '\n[TABLE_START]\n';
      } else if (block.type === 'table_row' && block.table_row && block.table_row.cells) {
        const cells = block.table_row.cells.map(cell =>
          cell.map(text => text.plain_text).join('').trim()
        );
        markdownContent += '| ' + cells.join(' | ') + ' |\n';
      }
    });

    if (markdownContent.trim()) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'page-content';
      contentDiv.style.marginTop = data.files && data.files.length > 0 ? '20px' : '0';

      const contentText = document.createElement('div');
      contentText.className = 'page-text';
      contentText.innerHTML = parseMarkdownToHTML(markdownContent);
      contentDiv.appendChild(contentText);

      childDetailsSection.appendChild(contentDiv);
    }

    container.appendChild(childDetailsSection);
    button.style.display = 'none';

  } catch (error) {
    console.error('子ページ詳細の表示中にエラーが発生しました:', error);
    button.style.pointerEvents = 'auto';
    button.style.opacity = '1';
    button.textContent = '詳細を表示';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = '子ページの詳細を取得できませんでした';
    container.appendChild(errorDiv);
  }
}

function populateFilterOptions(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

function onFilterChange(filterType, filterValue) {
  trackFilterUsage(filterType, filterValue);
  const activeFiltersDiv = document.getElementById('activeFilters');
  const filters = {
    subject: document.getElementById('subjectFilter').value,
    grade: document.getElementById('gradeFilter').value,
    period: document.getElementById('periodFilter').value
  };

  activeFiltersDiv.innerHTML = '';
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      const filterTag = document.createElement('span');
      filterTag.className = 'filter-tag';
      filterTag.textContent = `${key}: ${value}`;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.className = 'remove-filter';
      removeBtn.onclick = () => {
        document.getElementById(`${key}Filter`).value = '';
        onFilterChange(key, '');
        search();
      };
      filterTag.appendChild(removeBtn);
      activeFiltersDiv.appendChild(filterTag);
    }
  });

  search();
}

function clearFilters() {
  document.getElementById('subjectFilter').value = '';
  document.getElementById('gradeFilter').value = '';
  document.getElementById('periodFilter').value = '';
  onFilterChange('subject', '');
  search();
}

function disableScroll() {
  document.body.style.overflow = 'hidden';
}

function enableScroll() {
  document.body.style.overflow = '';
}

function fadeOutLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      enableScroll();
    }, 400);
  }
}

function startRoseLoadingAnimation() {
  const svg = document.getElementById('roseSVG');
  const rosePath = document.getElementById('rosePath');
  const roseShadowPath = document.getElementById('roseShadowPath');
  const roseHighlightPath = document.getElementById('roseHighlightPath');
  let angle = 0;
  let requestId;
  const radius = 120;
  const deltaAngle = 0.08;

  function drawRose() {
    const petals = 8;
    const k = Math.sin(angle) * 40 + 60;
    let path = '';
    for (let i = 0; i < 2 * Math.PI; i += (2 * Math.PI) / 360) {
      const r = radius * Math.cos(k * i);
      const x = r * Math.cos(i);
      const y = r * Math.sin(i);
      path += `${x},${y} `;
    }
    rosePath.setAttribute('d', `M ${path} Z`);
    roseShadowPath.setAttribute('d', `M ${path} Z`);
    roseHighlightPath.setAttribute('d', `M ${path} Z`);
    angle += deltaAngle;
    requestId = requestAnimationFrame(drawRose);
  }

  function resizeSvg() {
    const containerWidth = svg.parentElement.offsetWidth;
    svg.setAttribute('width', containerWidth);
    svg.setAttribute('height', containerWidth);
  }

  window.addEventListener('resize', resizeSvg);
  resizeSvg();
  drawRose();

  return {
    stop: () => cancelAnimationFrame(requestId)
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('closeFilter');
  const overlay = document.getElementById('filterOverlay');
  closeBtn?.addEventListener('click', closeFilter);
  overlay?.addEventListener('click', closeFilter);
  disableScroll();
  const isSmallScreen = window.matchMedia('(max-width: 480px)').matches;
  if (isSmallScreen) {
    const spinner = document.getElementById('spinnerContainer');
    if (spinner) {
      spinner.style.display = 'flex';
    }
  } else {
    startRoseLoadingAnimation();
  }
  initializeFilters().then(() => {
    const loadingStartTime = Date.now();
    const minDisplayTime = 700;
    setTimeout(() => {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      setTimeout(() => {
        if (isSmallScreen) {
          fadeOutLoadingScreen();
        }
      }, remainingTime);
    }, 100);
  }).catch((error) => {
    console.error('初期化エラー:', error);
    setTimeout(() => {
      fadeOutLoadingScreen();
    }, 2500);
  });
});

document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    sendGAEvent('search_enter_key', 'user_interaction', 'search_input');
    search();
  }
});

const searchInputElem = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearSearch');
searchInputElem?.addEventListener('input', () => {
  if (searchInputElem.value.trim()) {
    clearBtn.style.display = 'block';
  } else {
    clearBtn.style.display = 'none';
  }
});
clearBtn?.addEventListener('click', () => {
  if (searchInputElem) {
    searchInputElem.value = '';
  }
  clearBtn.style.display = 'none';
  search();
});

async function initializeFilters() {
  try {
    const response = await fetch('/filters');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    filterOptions = data;
    populateFilterOptions('subjectFilter', data.subjects);
    populateFilterOptions('gradeFilter', data.grades);
    populateFilterOptions('periodFilter', data.periods);

    console.log('フィルタの初期化が完了しました');
  } catch (error) {
    console.error('フィルタの初期化中にエラーが発生しました:', error);
    throw error;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
