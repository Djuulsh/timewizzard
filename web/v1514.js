// Timewizzard v1.5.14 — Facts fixed visual spacing.
// Published Facts rows now use the same visual gap after every label instead of
// trying to fake a table with label-length-dependent spacing in Discord's
// proportional font.

function v1514Init() {
  document.body.classList.add('v1514-facts-fixed-gap');
  document.title = 'Timewizzard Web Builder v1.5.14';
  const brand = document.querySelector('.brand small');
  if (brand) brand.textContent = 'v1.5.14 · Facts fixed visual spacing';
}

v1514Init();
