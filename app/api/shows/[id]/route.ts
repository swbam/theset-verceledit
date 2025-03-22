export async function GET(request: Request, { params }: { params: { id: string } }) {
  const show = await prisma.show.findUnique({
    where: { id: params.id },
    include: {
      setlist: {
        include: { songs: true }
      },
      venue: true
    }
  });

  // Refresh show data if stale (>24 hours)
  if (!show || new Date().getTime() - show.updatedAt.getTime() > 86400000) {
    const tmShow = await fetchTicketmasterEvent(params.id);
    
    const updatedShow = await prisma.show.upsert({
      where: { tmId: params.id },
      update: {
        date: new Date(tmShow.dates.start.localDate),
        ticketUrl: tmShow.url,
        venue: {
          update: {
            name: tmShow._embedded.venues[0].name,
            city: tmShow._embedded.venues[0].city.name,
            state: tmShow._embedded.venues[0].state?.stateCode
          }
        }
      },
      create: {
        tmId: tmShow.id,
        date: new Date(tmShow.dates.start.localDate),
        ticketUrl: tmShow.url,
        artist: { connect: { tmId: tmShow._embedded.attractions[0].id } },
        venue: {
          create: {
            tmId: tmShow._embedded.venues[0].id,
            name: tmShow._embedded.venues[0].name,
            city: tmShow._embedded.venues[0].city.name,
            state: tmShow._embedded.venues[0].state?.stateCode,
            country: tmShow._embedded.venues[0].country.countryCode
          }
        }
      }
    });

    return NextResponse.json(updatedShow);
  }

  return NextResponse.json(show);
} 