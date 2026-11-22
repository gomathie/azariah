/**
 * Who is shown the admin guide: the shop's owner, its admins (managers), and the Azaria support team.
 * Everyone signed in can read the user guide. The guides hold no private data, so this only decides
 * what is offered on screen.
 */
export function canReadAdminGuide(role: string | null | undefined, platformAdmin: boolean): boolean {
  return platformAdmin || role === 'owner' || role === 'manager'
}
