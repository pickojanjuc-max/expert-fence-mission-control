'use client';

import { useParams } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';

export default function ProjectPage() {
  const params = useParams();
  return <ProjectDetailClient projectId={params.id} />;
}
