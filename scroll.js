function scroll(root, options) {
  const error = err => `Infinate scroll - ${err}`;
  const addItem = options.addItem;
  if (!addItem) throw error('Method addItem is required');

  const ITEMS = options.items || 200;
  const PERPAGE = options.perPage || 15;
  const PAGPAGE = options.pagPage || 2;
  const def = options.deflection || 100;
  const DEFLECTION = () => get(root, '.page').getBoundingClientRect().height < def * 3 ? 0 : def;
  const maxPage = Math.ceil(ITEMS / PERPAGE);

  const main = get(root, '.main');
  const container = get(root, '.container');
  const navigation = get(root, '.navigation-block');

  const getItemsCount = page => {
    if (page > maxPage || page < 1) return 0;
    if (page == maxPage) return ITEMS % PERPAGE;
    return PERPAGE;
  };

  const hash = parseInt(location.hash.slice(1));
  let currentPage = !isNaN(hash) ? hash : 1;
  let hasMoreButton, hasPrevButton;
  let pages = [];

  const moreButton = document.createElement('div');
  moreButton.className = 'load-button load-more-button';
  moreButton.innerHTML = 'Load more';

  const lessButton = document.createElement('div');
  lessButton.className = 'load-button load-prev-button';
  lessButton.innerHTML = 'Load previous';

  moreButton.addEventListener('click', e => {
    moreButton.remove()
    hasMoreButton = false;
    addPage(pages[pages.length - 1] + 1);
    handleScroll();
  });
  lessButton.addEventListener('click', e => {
    const buttonHeight = lessButton.clientHeight;
    lessButton.remove()
    hasPrevButton = false;
    const page = addPage(pages[0] - 1, true);
    if (page && !main.scrollTop) main.scrollBy(0, page.clientHeight - buttonHeight);
  });

  const getClosest = () => {
    const ys = list(root, '.page').map(p => p.getBoundingClientRect().top - DEFLECTION());
    let i = 0;
    for (; i < ys.length; i++) if (!ys[i + 1] || ys[i + 1] > 0) break;
    return pages[i];
  }

  const addPage = (p, before) => {
    if (!getItemsCount(p)) return;

    if (before) pages.unshift(p);
    else pages.push(p);

    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.page = p;

    for (let j = 0; j < getItemsCount(p); j++) {
      const item = addItem(p);
      if (item) page.appendChild(item);
    }

    if (before) container.insertBefore(page, container.firstChild);
    else container.appendChild(page);
    return page;
  };

  const throttle = (fn, wait) => {
    let time = Date.now();
    return () => {
      if ((time + wait - Date.now()) >= 0) return;
      fn();
      time = Date.now();
    }
  };

  let oldScroll = 0;
  const handleScroll = () => {
    const top = main.scrollTop < oldScroll;
    oldScroll = main.scrollTop;

    const check = getClosest();

    if (currentPage != check) {
      currentPage = check;
      fillPagination();
      history.pushState({}, '', `#${currentPage}`);
    }

    if (top) {
      if (hasPrevButton) return;
      // FIXME: Fast scroll => ignored
      if (main.scrollTop > DEFLECTION()) return;
      if (!addPage(pages[0] - 1, true)) return;
    }
    else {
      if (hasMoreButton) return;
      if (main.scrollHeight > main.scrollTop + main.clientHeight) return;
      if (!addPage(pages[pages.length - 1] + 1)) return;
    }
    handleScroll();
  }

  main.addEventListener('scroll', throttle(handleScroll, 1));
  get(root, '.navigation-item--prev').addEventListener('click', e => {
    const t = e.target.closest('.navigation-item--prev');
    const pagesList = list(root, '.page');
    const current = pagesList[pages.indexOf(currentPage)];
    const target = pagesList[pages.indexOf(currentPage - 1)];
    if (target) {
      if (pages.indexOf(currentPage - 1) == 0 && (currentPage - 2)) addPage(currentPage - 2, true);
      main.scrollBy(0, target.getBoundingClientRect().top - DEFLECTION() + 1);
      return;
    }
    if (current.previousSibling == lessButton) {
      lessButton.click();
      t.click();
    }
    if (!addPage(pages[0] - 1, true)) main.scrollBy(0, -Number.MAX_SAFE_INTEGER);
    else t.click();
  });
  get(root, '.navigation-item--next').addEventListener('click', e => {
    const t = e.target.closest('.navigation-item--next');
    const pagesList = list(root, '.page');
    const current = pagesList[pages.indexOf(currentPage)];
    const target = pagesList[pages.indexOf(currentPage + 1)];
    if (target) {
      // TODO: If page is small — do not change page
      main.scrollBy(0, target.getBoundingClientRect().top - DEFLECTION() + 1);
      return;
    }
    if (current.nextSibling == moreButton) {
      moreButton.click();
      t.click();
    }
    if (!addPage(pages[pages.length - 1] + 1)) main.scrollBy(0, Number.MAX_SAFE_INTEGER);
    else t.click();
  });

  const pagButtons = [];
  for (let i = 0; i < PAGPAGE * 2 + 1; i++) {
    const b = document.createElement('div');
    b.className = 'navigation-item';
    b.onclick = () => {
      const page = parseInt(b.innerText);
      if (isNaN(page)) return;
      const pagesList = list(root, '.page');
      const current = pagesList[pages.indexOf(currentPage)];
      if (page < currentPage && pages.indexOf(page) == -1) {
        if (hasPrevButton) {
          lessButton.remove();
          hasPrevButton = false;
        }
        for (let i = pages[0]; i > page; i--) addPage(i - 1, true);
      }
      if (page > currentPage && pages.indexOf(page) == -1) {
        if (hasMoreButton) {
          moreButton.remove();
          hasMoreButton = false;
        }
        for (let i = pages[pages.length - 1]; i < page; i++) addPage(i + 1);
      }
      handleScroll();
      const nlist = list(root, '.page');
      const target = nlist[pages.indexOf(page)];
      main.scrollBy(0, target.getBoundingClientRect().top - DEFLECTION() + 1);
    };
    pagButtons.push(b);
  }

  const fillPagination = () => {
    for (let i = 0; i < pagButtons.length; i++) {
      const b = pagButtons[i];
      const num = currentPage + i - PAGPAGE;
      b.innerText = num + '';
      if (num == currentPage) b.classList.add('navigation-item--current');
      else b.classList.remove('navigation-item--current');
      navigation.insertBefore(b, get(root, '.navigation-item--next'));
      if (num < 1 || num > maxPage) navigation.removeChild(b);
    }
  }

  const init = () => {
    if (getItemsCount(currentPage - 1)) {
      container.appendChild(lessButton);
      hasPrevButton = true;
    }

    addPage(Math.min(maxPage, currentPage));

    if (getItemsCount(currentPage + 1)) {
      container.appendChild(moreButton);
      hasMoreButton = true;
    }

    fillPagination();
    handleScroll();
  }
  init();
}
