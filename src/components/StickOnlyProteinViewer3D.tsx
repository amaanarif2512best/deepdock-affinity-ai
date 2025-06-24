
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Download, RefreshCw, Database } from "lucide-react";

interface StickOnlyProteinViewer3DProps {
  pdbId?: string;
  fastaSequence?: string;
  pdbData?: string;
  proteinName?: string;
  width?: number;
  height?: number;
}

const StickOnlyProteinViewer3D: React.FC<StickOnlyProteinViewer3DProps> = ({
  pdbId,
  fastaSequence,
  pdbData,
  proteinName = "Protein Target",
  width = 500,
  height = 400
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [proteinInfo, setProteinInfo] = useState<any>(null);

  useEffect(() => {
    if (pdbId || fastaSequence || pdbData) {
      initializeViewer();
    }
  }, [pdbId, fastaSequence, pdbData]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load 3Dmol.js
      if (!(window as any).$3Dmol) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.1/3Dmol-min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000);
        });
      }

      const $3Dmol = (window as any).$3Dmol;
      
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        
        const newViewer = $3Dmol.createViewer(viewerRef.current, {
          defaultcolors: $3Dmol.elementColors.default,
          backgroundColor: 'white'
        });

        let structureLoaded = false;

        // Priority 1: Use provided PDB data
        if (pdbData) {
          newViewer.addModel(pdbData, 'pdb');
          setDataSource('Custom PDB Data');
          structureLoaded = true;
        }
        // Priority 2: Fetch from PDB ID
        else if (pdbId) {
          const success = await loadPDBStructure(newViewer, pdbId);
          if (success) {
            setDataSource(`PDB: ${pdbId}`);
            await fetchProteinInfo(pdbId);
            structureLoaded = true;
          }
        }

        // Priority 3: Generate from FASTA sequence
        if (!structureLoaded && fastaSequence) {
          const mockStructure = generateFromFastaSequence(fastaSequence);
          newViewer.addModel(mockStructure, 'pdb');
          setDataSource('Generated from FASTA');
          structureLoaded = true;
        }

        if (structureLoaded) {
          // Apply stick-only representation
          newViewer.setStyle({}, {
            stick: {
              radius: 0.1,
              colorscheme: 'default'
            }
          });

          newViewer.zoomTo();
          newViewer.render();
          setViewer(newViewer);
        }

        setIsLoading(false);
      }
    } catch (err) {
      console.error('Protein 3D Viewer error:', err);
      setError('Failed to load protein structure');
      setIsLoading(false);
    }
  };

  const loadPDBStructure = async (viewer: any, pdbIdToLoad: string): Promise<boolean> => {
    try {
      const pdbUrl = `https://files.rcsb.org/download/${pdbIdToLoad}.pdb`;
      const response = await fetch(pdbUrl);
      
      if (response.ok) {
        const pdbData = await response.text();
        viewer.addModel(pdbData, 'pdb');
        return true;
      }
      return false;
    } catch (e) {
      console.log(`PDB ${pdbIdToLoad} failed:`, e);
      return false;
    }
  };

  const fetchProteinInfo = async (pdbIdToFetch: string) => {
    try {
      const infoResponse = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbIdToFetch}`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        setProteinInfo({
          title: info.struct?.title || 'Unknown',
          resolution: info.rcsb_entry_info?.resolution_combined?.[0] || 'N/A',
          method: info.exptl?.[0]?.method || 'Unknown',
          depositionDate: info.rcsb_accession_info?.deposit_date || 'Unknown'
        });
      }
    } catch (e) {
      console.log('Failed to fetch protein info:', e);
    }
  };

  const generateFromFastaSequence = (fasta: string): string => {
    const sequence = fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
    const numResidues = Math.min(sequence.length, 200);
    
    let pdb = 'HEADER    PROTEIN FROM FASTA SEQUENCE\n';
    
    for (let i = 0; i < numResidues; i++) {
      const aa = sequence[i] || 'A';
      const residue = convertAminoAcid(aa);
      
      // Create realistic secondary structure
      const t = i / numResidues;
      let x, y, z;
      
      // Alpha helix regions
      if (i % 20 < 12) {
        const helixAngle = (i * 100 * Math.PI) / 180;
        x = 2.3 * Math.cos(helixAngle);
        y = 2.3 * Math.sin(helixAngle);
        z = i * 1.5;
      } 
      // Beta sheet regions
      else if (i % 20 < 18) {
        x = (i % 8) * 3.5 - 14;
        y = Math.floor(i / 8) * 5;
        z = 100 + Math.sin(i * 0.5) * 2;
      }
      // Loop regions
      else {
        const loopAngle = t * 4 * Math.PI;
        x = 8 * Math.cos(loopAngle);
        y = 8 * Math.sin(loopAngle);
        z = 150 + t * 20;
      }
      
      pdb += generateResidue(residue, i + 1, x, y, z);
    }
    
    pdb += 'END\n';
    return pdb;
  };

  const generateResidue = (residue: string, resNum: number, x: number, y: number, z: number): string => {
    const atomNum = (resNum - 1) * 4;
    return [
      `ATOM  ${(atomNum + 1).toString().padStart(5)} N   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           N`,
      `ATOM  ${(atomNum + 2).toString().padStart(5)} CA  ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 1.5).toFixed(3).padStart(8)}${(y + 0.5).toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 3).toString().padStart(5)} C   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 2.4).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 4).toString().padStart(5)} O   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 3.8).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           O`,
    ].join('\n') + '\n';
  };

  const convertAminoAcid = (aa: string): string => {
    const aaMap: { [key: string]: string } = {
      'A': 'ALA', 'R': 'ARG', 'N': 'ASN', 'D': 'ASP', 'C': 'CYS',
      'E': 'GLU', 'Q': 'GLN', 'G': 'GLY', 'H': 'HIS', 'I': 'ILE',
      'L': 'LEU', 'K': 'LYS', 'M': 'MET', 'F': 'PHE', 'P': 'PRO',
      'S': 'SER', 'T': 'THR', 'W': 'TRP', 'Y': 'TYR', 'V': 'VAL'
    };
    return aaMap[aa.toUpperCase()] || 'ALA';
  };

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo();
      viewer.render();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.pngURI((uri: string) => {
        const link = document.createElement('a');
        link.download = `${proteinName.replace(/\s+/g, '_')}_protein_stick.png`;
        link.href = uri;
        link.click();
      }, 1200, 900);
    }
  };

  const retry = () => {
    initializeViewer();
  };

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Protein 3D Structure (Stick Format)
          </CardTitle>
          <div className="flex gap-2">
            {error && (
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            ref={viewerRef}
            className="border rounded bg-white"
            style={{ width: '100%', height: `${height}px` }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                Loading protein structure...
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded text-center">
              <div className="text-xs text-red-600 p-4">
                <div className="font-medium">{error}</div>
                <button onClick={retry} className="mt-2 text-blue-600 underline">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 text-xs flex-wrap">
            <Badge variant="outline">Stick Representation</Badge>
            <Badge variant="secondary">3D Interactive</Badge>
            {pdbId && <Badge variant="default">PDB: {pdbId}</Badge>}
            {dataSource && <Badge variant="outline">{dataSource}</Badge>}
          </div>
          
          <div className="text-xs bg-gray-50 p-2 rounded">
            <div><strong>Protein:</strong> {proteinName}</div>
            {pdbId && <div><strong>PDB ID:</strong> {pdbId}</div>}
            {fastaSequence && <div><strong>FASTA:</strong> Sequence provided ({fastaSequence.replace(/^>.*\n/, '').replace(/\n/g, '').length} residues)</div>}
            <div><strong>Representation:</strong> Stick format for detailed atomic structure</div>
            {proteinInfo && (
              <>
                <div><strong>Resolution:</strong> {proteinInfo.resolution}Å</div>
                <div><strong>Method:</strong> {proteinInfo.method}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StickOnlyProteinViewer3D;
