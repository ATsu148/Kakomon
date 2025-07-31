    // フィルタオプションを格納する変数
    let filterOptions = {
      subjects: new Set(),
      grades: new Set(),
      periods: new Set()
    };

    // 検索パネルの状態を保持
    let isSearchPanelOpen = false;

    // ページ詳細のキャッシュ
    const pageDetailsCache = new Map();

    // プリロード用のキューと同時実行数制限
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

    // データを整理して表示する関数
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

    // 実際にコンテンツがあるかどうかを判定するヘルパー関数
    function hasActualContent(content) {
      if (!content || content.length === 0) return false;
      
      // 子ページブロックとPDFブロックを除外してからチェック
      const filteredContent = content.filter(block => 
        block.type !== 'child_page' && block.type !== 'pdf'
      );
      
      for (const block of filteredContent) {
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

    // Markdownテキストとコンテンツブロックを解析してHTMLに変換する関数
    function parseContentToHTML(blocks) {
      if (!blocks || blocks.length === 0) return '';
      
      let html = '';
      let inList = false;
      let listType = null;
      let inTable = false;
      let isFirstTableRow = true;
      let tableHeaders = [];
      
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // 画像ブロックの処理
        if (block.type === 'image' && block.image) {
          if (inList) {
            html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
            inList = false;
            listType = null;
          }
          if (inTable) {
            html += '</tbody></table></div>\n';
            inTable = false;
            isFirstTableRow = true;
            tableHeaders = [];
          }
          
          const imageUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
          const caption = block.image.caption ? block.image.caption.map(c => c.plain_text).join('') : '';
          
          html += `<div class="inline-image-container" style="
            margin: 20px 0;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
          ">
            <img src="${imageUrl}" alt="${caption || 'Image'}" style="
              max-width: 100%;
              max-height: 70vh;
              height: auto;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              cursor: pointer;
            " onclick="showImageModal('${imageUrl}', '${caption || 'Image'}')">`;
          
          if (caption) {
            html += `<div style="
              margin-top: 10px;
              font-size: 14px;
              color: var(--text-color);
              opacity: 0.8;
              font-style: italic;
            ">${caption}</div>`;
          }
          
          html += '</div>\n';
          continue;
        }
        
        // ファイルブロックの処理（PDFは除外、その他のファイルのみ表示）
        if (block.type === 'file' && block.file) {
          if (inList) {
            html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
            inList = false;
            listType = null;
          }
          if (inTable) {
            html += '</tbody></table></div>\n';
            inTable = false;
            isFirstTableRow = true;
            tableHeaders = [];
          }
          
          const fileData = block.file;
          const fileUrl = fileData.type === 'external' ? fileData.external.url : fileData.file.url;
          const fileName = fileData.name || 'Unnamed file';
          const caption = fileData.caption ? fileData.caption.map(c => c.plain_text).join('') : '';
          const fileType = block.type;
          
          const icon = '�';
          
          html += `<div class="inline-file-container" style="
            margin: 15px 0;
            padding: 15px;
            background: var(--file-bg);
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            backdrop-filter: blur(20px);
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 20px;">${icon}</span>
              <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" style="
                color: var(--accent-color);
                text-decoration: none;
                flex: 1;
                font-weight: 500;
              ">${fileName}</a>
              <button onclick="showInlineFile('${fileUrl}', '${fileName}', '${fileType}', this.parentNode.parentNode)" style="
                padding: 8px 16px;
                background: var(--accent-color);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
              ">表示</button>
            </div>`;
          
          if (caption) {
            html += `<div style="
              margin-top: 8px;
              font-size: 12px;
              color: var(--text-color);
              opacity: 0.7;
              font-style: italic;
            ">${caption}</div>`;
          }
          
          html += '</div>\n';
          continue;
        }
        
        // テキストコンテンツの処理
        let text = '';
        if (block.type === 'paragraph' && block.paragraph.rich_text) {
          text = block.paragraph.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (inList) {
              html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
              inList = false;
              listType = null;
            }
            if (inTable) {
              html += '</tbody></table></div>\n';
              inTable = false;
              isFirstTableRow = true;
              tableHeaders = [];
            }
            html += `<p>${text}</p>\n`;
          }
        } else if (block.type === 'heading_1' && block.heading_1.rich_text) {
          text = block.heading_1.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (inList) {
              html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
              inList = false;
              listType = null;
            }
            if (inTable) {
              html += '</tbody></table></div>\n';
              inTable = false;
              isFirstTableRow = true;
              tableHeaders = [];
            }
            html += `<h1>${text}</h1>\n`;
          }
        } else if (block.type === 'heading_2' && block.heading_2.rich_text) {
          text = block.heading_2.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (inList) {
              html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
              inList = false;
              listType = null;
            }
            if (inTable) {
              html += '</tbody></table></div>\n';
              inTable = false;
              isFirstTableRow = true;
              tableHeaders = [];
            }
            html += `<h2>${text}</h2>\n`;
          }
        } else if (block.type === 'heading_3' && block.heading_3.rich_text) {
          text = block.heading_3.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (inList) {
              html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
              inList = false;
              listType = null;
            }
            if (inTable) {
              html += '</tbody></table></div>\n';
              inTable = false;
              isFirstTableRow = true;
              tableHeaders = [];
            }
            html += `<h3>${text}</h3>\n`;
          }
        } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text) {
          text = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (!inList || listType !== 'ul') {
              if (inList && listType === 'ol') {
                html += '</ol>\n';
              }
              if (inTable) {
                html += '</tbody></table></div>\n';
                inTable = false;
                isFirstTableRow = true;
                tableHeaders = [];
              }
              html += '<ul>\n';
              inList = true;
              listType = 'ul';
            }
            html += `<li>${text}</li>\n`;
          }
        } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text) {
          text = block.numbered_list_item.rich_text.map(t => t.plain_text).join('').trim();
          if (text) {
            if (!inList || listType !== 'ol') {
              if (inList && listType === 'ul') {
                html += '</ul>\n';
              }
              if (inTable) {
                html += '</tbody></table></div>\n';
                inTable = false;
                isFirstTableRow = true;
                tableHeaders = [];
              }
              html += '<ol>\n';
              inList = true;
              listType = 'ol';
            }
            html += `<li>${text}</li>\n`;
          }
        } else if (block.type === 'table') {
          if (inList) {
            html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
            inList = false;
            listType = null;
          }
          inTable = true;
          isFirstTableRow = true;
          html += '<div class="table-container"><table>\n';
        } else if (block.type === 'table_row' && block.table_row && block.table_row.cells) {
          const cells = block.table_row.cells.map(cell => 
            cell.map(text => text.plain_text).join('').trim()
          );
          
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
        }
      }
      
      // 最後にリストやテーブルが開いている場合は閉じる
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
      }
      if (inTable) {
        html += '</tbody></table></div>\n';
      }
      
      return html;
    }

    function populateFilterOptions(selectId, options) {
      const select = document.getElementById(selectId);
      // 既存のオプション（"すべて"以外）をクリア
      while (select.children.length > 1) {
        select.removeChild(select.lastChild);
      }
      
      // 新しいオプションを追加
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
    }

    function clearFilters() {
      // Google Analytics: フィルタークリアイベントを追跡
      sendGAEvent('clear_filters', 'user_interaction', 'filter_controls');
      
      document.getElementById('subjectFilter').value = '';
      document.getElementById('gradeFilter').value = '';
      document.getElementById('periodFilter').value = '';
      // フィルタをクリアしても自動検索は実行しない
    }

    function onFilterChange(filterType, filterValue) {
      // Google Analytics: フィルター使用イベントを追跡
      trackFilterUsage(filterType, filterValue);
      
      // フィルタ変更後も検索は自動実行しない
    }

    async function search() {
     const query = document.getElementById('searchInput').value;
     const subject = document.getElementById('subjectFilter').value;
     const grade = document.getElementById('gradeFilter').value;
     const period = document.getElementById('periodFilter').value;
     const resultsDiv = document.getElementById('results');

      // モバイルでは検索実行時にパネルを閉じる
      if (window.innerWidth <= 767) {
        closeSearchPanel();
      }
      
      // Google Analytics: 検索イベントを追跡
      trackSearch(query, {
        subject: subject,
        grade: grade,
        period: period
      });
      
      resultsDiv.innerHTML = '<div class="loading">検索中</div>';
      
      // URLパラメータを構築
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

        const fragment = document.createDocumentFragment();

        for (const item of data) {
          const resultDiv = document.createElement('div');
          resultDiv.className = 'result-item';
          resultDiv.dataset.pageId = item.id;
          observer.observe(resultDiv);
          
          // タイトル
          const title = formatProperty(item.properties['名前']) || 'タイトル不明';
          const titleDiv = document.createElement('div');
          titleDiv.className = 'result-title';
          titleDiv.textContent = title;
          
          // メタ情報
          const metaDiv = document.createElement('div');
          metaDiv.className = 'result-meta';
          
          // 教科
          const subjects = formatProperty(item.properties['教科']);
          if (subjects) {
            const subjectSpan = document.createElement('span');
            subjectSpan.className = 'meta-item subject';
            subjectSpan.textContent = `教科: ${subjects}`;
            metaDiv.appendChild(subjectSpan);
          }
          
          // 学年
          const grade = formatProperty(item.properties['学年']);
          if (grade) {
            const gradeSpan = document.createElement('span');
            gradeSpan.className = 'meta-item grade';
            gradeSpan.textContent = `学年: ${grade}`;
            metaDiv.appendChild(gradeSpan);
          }
          
          // 時期
          const period = formatProperty(item.properties['時期']);
          if (period) {
            const periodSpan = document.createElement('span');
            periodSpan.className = 'meta-item period';
            periodSpan.textContent = `時期: ${period}`;
            metaDiv.appendChild(periodSpan);
          }
          
          resultDiv.appendChild(titleDiv);
          resultDiv.appendChild(metaDiv);
          
          // クリックして詳細を表示するリンク
          const showDetailsLink = document.createElement('a');
          showDetailsLink.textContent = '展開';
          showDetailsLink.href = '#';
          showDetailsLink.className = 'show-details-btn';
          showDetailsLink.dataset.pageId = item.id;
          showDetailsLink.dataset.title = item.properties.Name?.title?.[0]?.text?.content || 'Unknown Page';
          
          resultDiv.appendChild(showDetailsLink);
          fragment.appendChild(resultDiv);

          // IntersectionObserverが表示を検知した際にプリロードされます
        }

        resultsDiv.appendChild(fragment);

        // 検索結果生成後、すべてのshow-details-btnを強制的にクリーンアップ
        setTimeout(() => {
          cleanupShowDetailsButtons();
        }, 100);
        
      } catch (error) {
        console.error('検索エラー:', error);
        resultsDiv.innerHTML = '<div class="error">検索中にエラーが発生しました。</div>';
      }
    }

    // バックグラウンドでページ詳細をプリロード
    async function preloadPageDetails(pageId) {
      // 既にキャッシュされている場合はスキップ
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

    // キャッシュされたページ詳細を即座に表示
    async function showPageDetails(pageId, resultDiv, link) {
      // 既にファイルセクションが存在する場合は何もしない
      const existingFilesSection = resultDiv.querySelector('.files-section');
      if (existingFilesSection) {
        link.remove();
        return;
      }
      
      // リンクの元の状態を保存
      const originalText = link.textContent;
      const originalPointerEvents = link.style.pointerEvents;
      const originalOpacity = link.style.opacity;
      const originalDisplay = link.style.display;
      
      // リンクを無効化してローディング表示
      link.style.pointerEvents = 'none';
      link.style.opacity = '0.6';
      link.textContent = '読み込み中...';
      
      try {
        let data = pageDetailsCache.get(pageId);
        
        // キャッシュにない場合は即座に取得
        if (!data) {
          const response = await fetch(`/page/${pageId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          data = await response.json();
          pageDetailsCache.set(pageId, data);
        }
        
        // ファイルセクションを作成
        let filesSection = resultDiv.querySelector('.files-section');
        if (!filesSection) {
          filesSection = document.createElement('div');
          filesSection.className = 'files-section';
          resultDiv.appendChild(filesSection);
        }
        
        filesSection.innerHTML = '';
        
        if (data.files && data.files.length > 0) {
          // ファイル表示エリア（PDFやその他のファイルのみ）
          const filesTitle = document.createElement('h4');
          filesTitle.textContent = '添付ファイル:';
          filesSection.appendChild(filesTitle);
          
          data.files.forEach(file => {
            // 画像ファイルはスキップ（コンテンツ内で表示されるため）
            if (file.type === 'image') {
              return;
            }
            
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            
            const icon = document.createElement('span');
            icon.className = 'file-icon';
            // ファイルタイプに応じてアイコンを設定
            if (file.type === 'image') {
              icon.textContent = '🖼️';
            } else if (file.type === 'pdf') {
              icon.textContent = '📄';
            } else {
              icon.textContent = '�';
            }
            
            const link = document.createElement('a');
            link.className = 'file-link';
            link.href = file.url;
            link.textContent = file.name;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'file-actions';
            
            const expandBtn = document.createElement('button');
            expandBtn.className = 'file-btn expand-btn';
            expandBtn.textContent = '展開';
            expandBtn.onclick = () => {
              // Google Analytics: ファイル表示イベントを追跡
              trackFileAction('file_view', file.name, file.url);
              
              // iOS の場合は新しいタブで開く
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              if (isIOS) {
                window.open(file.url, '_blank', 'noopener,noreferrer');
              } else {
                // ファイルタイプに応じて表示方法を変更
                if (file.type === 'image') {
                  showImage(file.url, file.name, resultDiv);
                } else {
                  showPDF(file.url, file.name, resultDiv);
                }
              }
            };

            actionsDiv.appendChild(expandBtn);
            
            fileDiv.appendChild(icon);
            fileDiv.appendChild(link);
            fileDiv.appendChild(actionsDiv);
            filesSection.appendChild(fileDiv);
            
            // キャプション表示
            if (file.caption) {
              const captionDiv = document.createElement('div');
              captionDiv.className = 'file-caption';
              captionDiv.textContent = file.caption;
              captionDiv.style.cssText = `
                font-size: 12px;
                color: var(--text-color);
                opacity: 0.7;
                margin-top: 5px;
                font-style: italic;
              `;
              filesSection.appendChild(captionDiv);
            }
          });
        }
        
        console.log(`Page data received:`, {
          filesCount: data.files ? data.files.length : 0,
          childPagesCount: data.childPages ? data.childPages.length : 0,
          contentBlocksCount: data.content ? data.content.length : 0
        });
        
        // 子ページの表示
        if (data.childPages && data.childPages.length > 0) {
          console.log(`Found ${data.childPages.length} child pages:`, data.childPages);
          console.log('Creating child pages section...');
          
          const childPagesTitle = document.createElement('h4');
          childPagesTitle.textContent = '子ページ:';
          childPagesTitle.style.marginTop = '20px';
          filesSection.appendChild(childPagesTitle);
          console.log('Child pages title added to filesSection');
          
          data.childPages.forEach((childPage, index) => {
            console.log(`Processing child page ${index + 1}:`, childPage);
            
            const childPageDiv = document.createElement('div');
            childPageDiv.className = 'child-page-item';
            // CSSクラスでスタイリングを行うため、インラインスタイルは最小限に
            
            const childPageTitle = document.createElement('h5');
            childPageTitle.textContent = childPage.title;
            childPageTitle.style.cssText = `
              margin: 0 0 10px 0;
              color: var(--text-color);
              font-size: 16px;
            `;
            childPageDiv.appendChild(childPageTitle);
            console.log(`Child page title "${childPage.title}" added`);
            
            if (childPage.error) {
              console.log(`Child page has error: ${childPage.error}`);
              const errorMsg = document.createElement('div');
              errorMsg.textContent = childPage.error;
              errorMsg.style.cssText = `
                color: #e74c3c;
                font-style: italic;
                font-size: 14px;
              `;
              childPageDiv.appendChild(errorMsg);
            } else {
              console.log('Creating child page button...');
              // 子ページの詳細を表示するボタン
              const showChildPageBtn = document.createElement('button');
              showChildPageBtn.textContent = '子ページを表示';
              showChildPageBtn.classList.add('child-page-btn');

              // ホバー時のアニメーションはJSで制御
              showChildPageBtn.onmouseover = () => {
                showChildPageBtn.style.transform = 'translateY(-3px) scale(1.02)';
              };
              showChildPageBtn.onmouseout = () => {
                showChildPageBtn.style.transform = 'translateY(0) scale(1)';
              };
              showChildPageBtn.dataset.childPageId = childPage.id;
              showChildPageBtn.dataset.title = childPage.title;
              
              childPageDiv.appendChild(showChildPageBtn);
              console.log('Child page button added to childPageDiv');
            }
            
            filesSection.appendChild(childPageDiv);
            console.log(`Child page div added to filesSection for: ${childPage.title}`);
          });
          console.log('All child pages processed and added to DOM');
        } else {
          console.log('No child pages found or data.childPages is empty/null');
        }
        
        // ページ内容の表示（順序通りに画像とテキストを統合）
        if (data.content && data.content.length > 0) {
          // 親ページのコンテンツを処理（子ページブロックは既にサーバー側で除外済み）
          const parentContentBlocks = data.content.filter(block => {
            if (block.type === 'child_page') {
              console.log(`Excluding child_page block from parent content: ${block.child_page?.title || block.id}`);
              return false;
            }
            return true;
          });
          
          // 実際にコンテンツがある場合のみページ内容ブロックを表示（PDFブロックも除外してチェック）
          if (parentContentBlocks.length > 0 && hasActualContent(parentContentBlocks)) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'page-content';
            contentDiv.style.marginTop = data.files && data.files.length > 0 || data.childPages && data.childPages.length > 0 ? '20px' : '0';
            
            const contentTitle = document.createElement('h4');
            contentTitle.textContent = 'ページ内容:';
            contentTitle.style.cssText = `
              color: var(--text-color);
              margin-bottom: 15px;
              font-size: 16px;
              border-bottom: 2px solid rgba(44, 62, 80, 0.1);
              padding-bottom: 5px;
            `;
            contentDiv.appendChild(contentTitle);
            
            const contentText = document.createElement('div');
            contentText.className = 'page-text';
            contentText.innerHTML = parseContentToHTML(parentContentBlocks);
            contentDiv.appendChild(contentText);
            
            filesSection.appendChild(contentDiv);
          }
        }
        
        // ファイルもページ内容もない場合のみメッセージを表示（子ページがある場合は除外）
        // hasActualContent関数は既に子ページブロックを除外して判定している
        if ((!data.files || data.files.length === 0) && 
            (!data.content || data.content.length === 0 || !hasActualContent(data.content)) &&
            (!data.childPages || data.childPages.length === 0)) {
          console.log('No files, content, or child pages found - showing empty message');
          filesSection.innerHTML = '<div style="color: var(--text-color); font-style: italic; text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; border: 1px dashed rgba(44, 62, 80, 0.3);">ファイルとページ内容はありません</div>';
        } else {
          console.log('Content exists (files, content, or child pages) - not showing empty message');
        }
        
        // 成功時はリンクを完全に削除
        link.remove();
        
      } catch (error) {
        console.error('ページ詳細の表示中にエラーが発生しました:', error);
        // エラー時はボタンの状態を元に戻す
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
        link.textContent = originalText || '展開';
        link.style.display = originalDisplay || 'block';
        
        let filesSection = resultDiv.querySelector('.files-section');
        if (!filesSection) {
          filesSection = document.createElement('div');
          filesSection.className = 'files-section';
          resultDiv.appendChild(filesSection);
        }
        filesSection.innerHTML = '<div style="color: #ff6b6b;">エラー: 詳細を取得できませんでした</div>';
      }
    }        // 子ページの詳細を表示する関数
    async function showChildPageDetails(childPageId, container, button) {
      // 既に子ページ詳細セクションが存在する場合は何もしない
      const existingChildDetailsSection = container.querySelector('.child-page-details');
      if (existingChildDetailsSection) {
        return;
      }
      
      // ボタンの元の状態を保存
      const originalText = button.textContent;
      const originalPointerEvents = button.style.pointerEvents;
      const originalOpacity = button.style.opacity;
      
      // ボタンを無効化してローディング表示
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.6';
      button.textContent = '読み込み中...';
      
      try {
        const response = await fetch(`/child-page/${childPageId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 子ページ詳細セクションを作成
        let childDetailsSection = container.querySelector('.child-page-details');
        if (!childDetailsSection) {
          childDetailsSection = document.createElement('div');
          childDetailsSection.className = 'child-page-details';
          childDetailsSection.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          `;
          container.appendChild(childDetailsSection);
        }
        
        childDetailsSection.innerHTML = '';
        
        // 子ページのファイル表示（PDFやその他のファイルのみ）
        if (data.files && data.files.length > 0) {
          const filesTitle = document.createElement('h6');
          filesTitle.textContent = '添付ファイル:';
          filesTitle.style.cssText = `
            margin: 0 0 10px 0;
            color: var(--text-color);
            font-size: 14px;
          `;
          childDetailsSection.appendChild(filesTitle);
          
          data.files.forEach(file => {
            // 画像ファイルはスキップ（コンテンツ内で表示されるため）
            if (file.type === 'image') {
              return;
            }
            
            const fileDiv = document.createElement('div');
            fileDiv.className = 'child-file-item';
            fileDiv.style.cssText = `
              display: flex;
              align-items: center;
              margin: 8px 0;
              padding: 8px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 6px;
              font-size: 14px;
            `;
            
            const icon = document.createElement('span');
            // ファイルタイプに応じてアイコンを設定
            if (file.type === 'image') {
              icon.textContent = '🖼️';
            } else if (file.type === 'pdf') {
              icon.textContent = '📄';
            } else {
              icon.textContent = '�';
            }
            icon.style.marginRight = '8px';
            
            const link = document.createElement('a');
            link.href = file.url;
            link.textContent = file.name;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.cssText = `
              color: var(--accent-color);
              text-decoration: none;
              flex: 1;
            `;
            link.onmouseover = () => link.style.textDecoration = 'underline';
            link.onmouseout = () => link.style.textDecoration = 'none';
            
            const expandBtn = document.createElement('button');
            expandBtn.textContent = '展開';
            
            // CSS変数を使用してテーマに対応
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
            
            expandBtn.style.cssText = `
              padding: 4px 8px;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              margin-left: 8px;
            `;
            expandBtn.style.background = accentColor;
            expandBtn.onclick = () => {
              // Google Analytics: 子ページファイル表示イベントを追跡
              trackFileAction('child_file_view', file.name, file.url);
              
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              if (isIOS) {
                window.open(file.url, '_blank', 'noopener,noreferrer');
              } else {
                // ファイルタイプに応じて表示方法を変更
                if (file.type === 'image') {
                  showImage(file.url, file.name, childDetailsSection);
                } else {
                  showPDF(file.url, file.name, childDetailsSection);
                }
              }
            };
            
            fileDiv.appendChild(icon);
            fileDiv.appendChild(link);
            fileDiv.appendChild(expandBtn);
            childDetailsSection.appendChild(fileDiv);
            
            // キャプション表示
            if (file.caption) {
              const captionDiv = document.createElement('div');
              captionDiv.style.cssText = `
                font-size: 11px;
                color: var(--text-color);
                opacity: 0.6;
                margin-top: 3px;
                margin-left: 24px;
                font-style: italic;
              `;
              captionDiv.textContent = file.caption;
              childDetailsSection.appendChild(captionDiv);
            }
          });
        }
        
        // 子ページのコンテンツ表示（順序通りに画像とテキストを統合）
        if (data.content && data.content.length > 0) {
          // 子ページ内で更にネストされた子ページがある場合は除外
          const childContentBlocks = data.content.filter(block => {
            if (block.type === 'child_page') {
              console.log(`Excluding nested child_page block from child page content: ${block.child_page?.title || block.id}`);
              return false;
            }
            return true;
          });
          
          if (childContentBlocks.length > 0 && hasActualContent(childContentBlocks)) {
            const contentTitle = document.createElement('h6');
            contentTitle.textContent = 'ページ内容:';
            contentTitle.style.cssText = `
              margin: 15px 0 10px 0;
              color: var(--text-color);
              font-size: 14px;
            `;
            childDetailsSection.appendChild(contentTitle);
            
            const contentText = document.createElement('div');
            contentText.className = 'child-page-text';
            contentText.style.cssText = `
              font-size: 14px;
              line-height: 1.6;
            `;
            contentText.innerHTML = parseContentToHTML(childContentBlocks);
            childDetailsSection.appendChild(contentText);
          }
        }
        
        // ファイルもコンテンツもない場合
        if ((!data.files || data.files.length === 0) && (!data.content || data.content.length === 0 || !hasActualContent(data.content))) {
          childDetailsSection.innerHTML = '<div style="color: #7f8c8d; font-style: italic; text-align: center; padding: 10px; font-size: 14px;">この子ページにはコンテンツがありません</div>';
        }
        
        // ボタンを「閉じる」に変更
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
        button.textContent = '子ページを閉じる';
        button.onclick = () => {
          childDetailsSection.style.display = 'none';
          button.textContent = '子ページを表示';
          button.onclick = () => {
            childDetailsSection.style.display = 'block';
            button.textContent = '子ページを閉じる';
            button.onclick = () => {
              childDetailsSection.style.display = 'none';
              button.textContent = '子ページを表示';
              button.onclick = () => {
                childDetailsSection.style.display = 'block';
                button.textContent = '子ページを閉じる';
                button.onclick = arguments.callee.caller;
              };
            };
          };
        };
        
      } catch (error) {
        console.error('子ページ詳細の表示中にエラーが発生しました:', error);
        // エラー時はボタンの状態を元に戻す
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
        button.textContent = '子ページを表示';
        
        let childDetailsSection = container.querySelector('.child-page-details');
        if (!childDetailsSection) {
          childDetailsSection = document.createElement('div');
          childDetailsSection.className = 'child-page-details';
          childDetailsSection.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          `;
          container.appendChild(childDetailsSection);
        }
        childDetailsSection.innerHTML = '<div style="color: #e74c3c; font-size: 14px;">エラー: 子ページの詳細を取得できませんでした</div>';
      }
    }

    // PDF表示関数
    function showPDF(url, name, container) {
      // 既存のPDFビューアーがあれば削除
      const existingViewer = container.querySelector('.pdf-viewer, .ios-pdf-viewer');
      if (existingViewer) {
        existingViewer.remove();
      }
      
      // ユーザーエージェントの検出
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS || isSafari) {
        // iOS/Safari用の特別な処理
        const iosViewer = document.createElement('div');
        iosViewer.className = 'ios-pdf-viewer';
        iosViewer.innerHTML = `
          <div class="ios-pdf-message" style="
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.3);
          ">
            <p style="margin-bottom: 15px; color: var(--text-color); font-weight: 500;">
              📱 ${name}
            </p>
            <p style="margin-bottom: 15px; color: var(--text-color); font-size: 14px;">
              iOSデバイスではPDFを新しいタブで開きます
            </p>
            <button onclick="window.open('${url}', '_blank', 'noopener,noreferrer')" style="
              padding: 12px 20px;
              background: linear-gradient(135deg, rgba(255, 145, 115, 0.85) 0%, rgba(255, 138, 101, 0.85) 100%);
              color: white;
              border: none;
              border-radius: 10px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
              border: 2px solid rgba(255, 255, 255, 0.3);
              backdrop-filter: blur(10px);
              transition: all 0.3s ease;
            ">
              PDFを開く
            </button>
          </div>
        `;
        container.appendChild(iosViewer);
      } else {
        // その他のブラウザ用
        const iframe = document.createElement('iframe');
        iframe.className = 'pdf-viewer';
        iframe.src = url;
        iframe.title = name;
        iframe.style.cssText = `
          width: 100%;
          height: 400px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 15px;
          margin-top: 15px;
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease-out;
        `;
        
        // 画面幅に応じて高さを調整
        if (window.innerWidth >= 768) {
          iframe.style.height = '70vh';
          iframe.style.minHeight = '500px';
          iframe.style.maxWidth = '100vw';
        } else if (window.innerWidth < 480) {
          iframe.style.height = '60vh';
          iframe.style.minHeight = '';
        }
        
        container.appendChild(iframe);
      }
    }

    // 画像表示関数
    function showImage(url, name, container) {
      // 既存の画像ビューアーがあれば削除
      const existingViewer = container.querySelector('.image-viewer');
      if (existingViewer) {
        existingViewer.remove();
      }
      
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-viewer';
      imageContainer.style.cssText = `
        margin-top: 15px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 15px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        animation: fadeInUp 0.6s ease-out;
      `;
      
      const imageTitle = document.createElement('h4');
      imageTitle.textContent = name;
      imageTitle.style.cssText = `
        margin: 0 0 10px 0;
        color: var(--text-color);
        font-size: 16px;
      `;
      imageContainer.appendChild(imageTitle);
      
      const img = document.createElement('img');
      img.src = url;
      img.alt = name;
      img.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        height: auto;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s ease;
        cursor: pointer;
      `;
      
      // 画像クリックで拡大表示
      img.onclick = () => {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          cursor: pointer;
        `;
        
        const modalImg = document.createElement('img');
        modalImg.src = url;
        modalImg.alt = name;
        modalImg.style.cssText = `
          max-width: 95%;
          max-height: 95%;
          object-fit: contain;
          border-radius: 10px;
        `;
        
        modal.appendChild(modalImg);
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
      };
      
      // ホバー効果
      img.onmouseover = () => {
        img.style.transform = 'scale(1.02)';
      };
      img.onmouseout = () => {
        img.style.transform = 'scale(1)';
      };
      
      // 画像読み込みエラーの処理
      img.onerror = () => {
        imageContainer.innerHTML = `
          <div style="color: #e74c3c; padding: 20px; text-align: center;">
            <p>画像を読み込めませんでした</p>
            <p style="font-size: 12px; opacity: 0.7;">${name}</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color);">
              元のリンクで開く
            </a>
          </div>
        `;
      };
      
      imageContainer.appendChild(img);
      container.appendChild(imageContainer);
    }

    // インライン画像モーダル表示関数
    function showImageModal(url, name) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
      `;
      
      const modalImg = document.createElement('img');
      modalImg.src = url;
      modalImg.alt = name;
      modalImg.style.cssText = `
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 10px;
      `;
      
      modal.appendChild(modalImg);
      modal.onclick = () => modal.remove();
      document.body.appendChild(modal);
    }

    // インラインファイル表示関数
    function showInlineFile(url, name, fileType, container) {
      // 既存のファイルビューアーがあれば削除
      const existingViewer = container.querySelector('.inline-file-viewer');
      if (existingViewer) {
        existingViewer.remove();
        return;
      }
      
      const viewerContainer = document.createElement('div');
      viewerContainer.className = 'inline-file-viewer';
      viewerContainer.style.cssText = `
        margin-top: 15px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.05);
      `;
      
      if (fileType === 'pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = name;
        iframe.style.cssText = `
          width: 100%;
          height: 500px;
          border: none;
        `;
        viewerContainer.appendChild(iframe);
      } else {
        // その他のファイルは新しいタブで開く
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
          text-align: center;
          padding: 20px;
          color: var(--text-color);
        `;
        messageDiv.innerHTML = `
          <p>${name}</p>
          <button onclick="window.open('${url}', '_blank', 'noopener,noreferrer')" style="
            margin-top: 10px;
            padding: 10px 20px;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          ">新しいタブで開く</button>
        `;
        viewerContainer.appendChild(messageDiv);
      }
      
      container.appendChild(viewerContainer);
    }

    // ローディング画面表示中のスクロール制御
    function disableScroll() {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    
    function enableScroll() {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    // 正葉曲線ローディングアニメーション
    
    // ローディング画面のフェードアウト
    function fadeOutLoadingScreen() {
      const loadingScreen = document.getElementById('loadingScreen');
      const mainContent = document.getElementById('mainContent');
      
      // 300ms ease-out フェード
      loadingScreen.style.transition = 'opacity 0.3s ease-out, visibility 0.3s ease-out';
      loadingScreen.classList.add('hidden');
      
      // スクロールを有効にする
      enableScroll();
      
      // メインコンテンツをフェードイン
      setTimeout(() => {
        mainContent.classList.add('visible');
      }, 50); // 150ms → 50ms
    }    // ページ読み込み時の初期化
    window.addEventListener('DOMContentLoaded', () => {
      disableScroll();
      initializeSearchPanel();
      handleSearchPanelOnScroll();

      const spinner = document.getElementById('spinnerContainer');
      if (spinner) {
        spinner.style.display = 'flex';
      }

      initializeFilters().then(() => {
        const start = Date.now();
        const minTime = 500;

        setTimeout(() => {
          const elapsed = Date.now() - start;
          const remain = Math.max(0, minTime - elapsed);

          setTimeout(() => {
            fadeOutLoadingScreen();
          }, remain);
        }, 100);
      }).catch((error) => {
        console.error('初期化エラー:', error);
        setTimeout(() => {
          fadeOutLoadingScreen();
        }, 1500);
      });
    });
   // レスポンシブに応じた検索パネルの初期化
    function initializeSearchPanel() {
      const panel = document.getElementById('searchPanel');
      const fab = document.getElementById('fab');
      const icon = document.getElementById('fabIcon');

      if (!panel || !fab || !icon) return;
      if (isSearchPanelOpen) {
        panel.classList.add('open');
        fab.classList.add('hidden');
        icon.innerHTML = '✖';
      } else {
        panel.classList.remove('open');
        fab.classList.remove('hidden');
        fab.style.display = '';
        icon.innerHTML = '&#128269;';
      }
    }

    // ウィンドウリサイズ時の対応
    window.addEventListener('resize', () => {
      initializeSearchPanel();
      handleSearchPanelOnScroll();
    });

    // モバイル向け: スクロール位置に応じて検索パネル表示を切り替え
    window.addEventListener('scroll', handleSearchPanelOnScroll);

    function handleSearchPanelOnScroll() {
      const panel = document.getElementById('searchPanel');
      const fab = document.getElementById('fab');
      const overlay = document.getElementById('searchPanelOverlay');

      if (!panel || !fab) return;

      // 非モバイル環境またはモーダル表示中は何もしない
      if (window.innerWidth > 767 || isSearchPanelOpen) {
        panel.classList.remove('search-panel-inline');
        return;
      }

      if (window.scrollY <= 10) {
        panel.classList.add('search-panel-inline', 'open');
        fab.classList.add('hidden');
        if (overlay) overlay.classList.remove('active');
      } else {
        panel.classList.remove('search-panel-inline');
        panel.classList.remove('open');
        fab.classList.remove('hidden');
        if (overlay) overlay.classList.remove('active');
        isSearchPanelOpen = false;
      }
    }
    // Enterキーで検索
    document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        // Google Analytics: Enterキーによる検索イベントを追跡
        sendGAEvent('search_enter_key', 'user_interaction', 'search_input');
        search();
      }
    });

    // initializeFilters関数をPromiseを返すように修正
    async function initializeFilters() {
      try {
        const response = await fetch('/filters');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // グローバル変数に保存
        filterOptions = data;
        
        // セレクトボックスにオプションを追加
        populateFilterOptions('subjectFilter', data.subjects);
        populateFilterOptions('gradeFilter', data.grades);
        populateFilterOptions('periodFilter', data.periods);

        // 時期フィルタはデフォルトで「前期期末」を選択
        const periodSelect = document.getElementById('periodFilter');
        if (periodSelect) {
          periodSelect.value = '前期期末';
        }
        
        console.log('フィルタの初期化が完了しました');
      } catch (error) {
        console.error('フィルタの初期化中にエラーが発生しました:', error);
        throw error;
      }
    }    function openSearchPanel() {
      const panel = document.getElementById('searchPanel');
      const fab = document.getElementById('fab');
      const icon = document.getElementById('fabIcon');
      const overlay = document.getElementById('searchPanelOverlay');

      if (!panel || !fab || !icon) {
        console.error('Required elements not found');
        return;
      }
      
      // オーバーレイを表示
      if (overlay) {
        overlay.classList.add('active');
      }
      
      panel.classList.add('open');
      fab.classList.add('hidden');
      icon.innerHTML = '✖';

      // 状態を更新
      isSearchPanelOpen = true;
      
      // 検索入力にフォーカス（モバイルでは少し遅延）
      setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && window.innerWidth <= 767) {
          searchInput.focus();
        }
      }, 400);
      
      // Google Analytics: パネル開くイベントを追跡
      sendGAEvent('open_search_panel', 'user_interaction', 'fab_button');
    }    function closeSearchPanel() {
      const panel = document.getElementById('searchPanel');
      const fab = document.getElementById('fab');
      const icon = document.getElementById('fabIcon');
      const overlay = document.getElementById('searchPanelOverlay');

      if (!panel || !fab || !icon) {
        console.error('Required elements not found');
        return;
      }
      
      // オーバーレイを隠す
      if (overlay) {
        overlay.classList.remove('active');
      }
      
      panel.classList.remove('open');
      fab.classList.remove('hidden');
      icon.innerHTML = '&#128269;';

      // 状態を更新
      isSearchPanelOpen = false;
      
      // Google Analytics: パネル閉じるイベントを追跡
      sendGAEvent('close_search_panel', 'user_interaction', 'fab_button');
    }

    // 従来のトグル関数は互換性のため保持
    function toggleSearchPanel() {
      const panel = document.getElementById('searchPanel');
      if (panel && panel.classList.contains('open')) {
        closeSearchPanel();
      } else {
        openSearchPanel();
      }
    }

    
    // Liquid Glass効果を適用するためのインラインスタイル削除
    function cleanupShowDetailsButtons() {
      const buttons = document.querySelectorAll('.show-details-btn');
      buttons.forEach(button => {
        // インラインスタイルを削除
        button.removeAttribute('style');
        // liquid glassクラスを追加
        button.classList.add('liquid-glass-button');
        
        // 強制的にスタイルをリセット（PC版対応）
        button.style.cssText = '';
        
        // 重要なスタイル属性を強制的に設定
        button.setAttribute('data-liquid-glass', 'true');
      });
      
      // デバッグ用ログ
      console.log(`Cleaned up ${buttons.length} show-details-btn elements`);
    }
    
    // MutationObserverを使用してDOM変更を監視
    const styleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const buttons = node.querySelectorAll ? node.querySelectorAll('.show-details-btn') : [];
              buttons.forEach(button => {
                button.removeAttribute('style');
                button.classList.add('liquid-glass-button');
                button.style.cssText = '';
                button.setAttribute('data-liquid-glass', 'true');
              });
              
              // ノード自体がshow-details-btnかチェック
              if (node.classList && node.classList.contains('show-details-btn')) {
                node.removeAttribute('style');
                node.classList.add('liquid-glass-button');
                node.style.cssText = '';
                node.setAttribute('data-liquid-glass', 'true');
              }
            }
          });
        }
      });
    });
    
    // 観察を開始
    styleObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 初期化時にも実行
    document.addEventListener('DOMContentLoaded', () => {
      cleanupShowDetailsButtons();

      const results = document.getElementById('results');
      if (results) {
        results.addEventListener('click', (event) => {
          const detailsBtn = event.target.closest('.show-details-btn');
          if (detailsBtn) {
            event.preventDefault();
            if (detailsBtn.style.display === 'none' ||
                detailsBtn.style.pointerEvents === 'none' ||
                detailsBtn.textContent === '読み込み中...' ||
                !detailsBtn.parentNode) {
              return;
            }
            const resultDiv = detailsBtn.closest('.result-item');
            trackPageDetailsView(detailsBtn.dataset.title || 'Unknown Page');
            showPageDetails(detailsBtn.dataset.pageId, resultDiv, detailsBtn);
            return;
          }

          const childBtn = event.target.closest('.child-page-btn');
          if (childBtn) {
            if (childBtn.style.pointerEvents === 'none' ||
                childBtn.textContent === '読み込み中...' ||
                !childBtn.parentNode) {
              return;
            }
            const container = childBtn.closest('.child-page-item');
            // Google Analytics: 子ページ表示イベントを追跡
            trackChildPageView(childBtn.dataset.title || 'Unknown Child Page');
            showChildPageDetails(childBtn.dataset.childPageId, container, childBtn);
          }
        });
      }
    });
    
    // Google Analytics トラッキング関数
    function trackSearch(query, filters) {
      console.log('Search tracked:', { query, filters });
      // 実際のGA実装時にはここにGAコードを追加
    }
    
    function trackFilterUsage(filterType, filterValue) {
      console.log('Filter usage tracked:', { filterType, filterValue });
      // 実際のGA実装時にはここにGAコードを追加
    }
    
    function sendGAEvent(eventName, category, label) {
      console.log('GA Event:', { eventName, category, label });
      // 実際のGA実装時にはここにGAコードを追加
    }
    
    function trackFileAction(action, fileName, fileUrl) {
      console.log('File action tracked:', { action, fileName, fileUrl });
      // 実際のGA実装時にはここにGAコードを追加
    }
    
    function trackPageDetailsView(pageTitle) {
      console.log('Page details view tracked:', pageTitle);
      // 実際のGA実装時にはここにGAコードを追加
    }
    
    function trackChildPageView(childPageTitle) {
      console.log('Child page view tracked:', childPageTitle);
      // 実際のGA実装時にはここにGAコードを追加
    }
